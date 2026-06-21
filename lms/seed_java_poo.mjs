// Seed d'un cours complet "Programmation Orientée Objet en Java" dans le LMS (MongoDB Atlas).
// Sections = vraies vidéos YouTube FR. Lié à la compétence Java (skill_id 51) niveau 2.
// Exécuter depuis lms/ :  node seed_java_poo.mjs
import mongoose from 'mongoose';
import { readFileSync } from 'fs';

// --- Charge MONGODB_URI depuis .env.local (script standalone, hors Next) ---
const env = readFileSync('.env.local', 'utf8');
const URI = env.split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='))?.slice('MONGODB_URI='.length).trim();
if (!URI) throw new Error('MONGODB_URI introuvable dans .env.local');

// --- Couplage RH (Postgres) ---
const INSTRUCTOR_ID = 33;          // yasser@techcorp.com (RECRUITER, is_instructor)
const INSTRUCTOR_NAME = 'Yasser Bennani';
const COMPANY_ID = 9;              // TechCorp
const SKILL_ID = 51;              // compétence "Java" (ROME M1805)
const SKILL_LEVEL = 2;            // niveau attesté à la réussite de l'examen
const LEARNER_ID = 37;           // Houssine Mir (apprenant démo)
const COURSE_TITLE = 'Programmation Orientée Objet en Java';

// --- Schémas (alignés sur lms/models/*) ---
const { Schema } = mongoose;
const Category = mongoose.model('Category', new Schema({ name: String, description: String, instructorId: Number }, { timestamps: true }));
const Course = mongoose.model('Course', new Schema({
  title: String, description: String, categoryId: Schema.Types.ObjectId, instructorId: Number, instructorName: String,
  price: Number, thumbnail: String, status: String, modules: [Schema.Types.ObjectId], finalExam: Schema.Types.ObjectId,
  skillId: Number, skillLevel: Number, companyId: Number,
}, { timestamps: true }));
const Module = mongoose.model('Module', new Schema({
  title: String, description: String, courseId: Schema.Types.ObjectId, order: Number, sections: [Schema.Types.ObjectId], quiz: Schema.Types.ObjectId,
}, { timestamps: true }));
const Section = mongoose.model('Section', new Schema({
  title: String, description: String, moduleId: Schema.Types.ObjectId, type: String, order: Number,
  fileUrl: String, fileName: String, fileType: String, youtubeUrl: String,
}, { timestamps: true }));
const Quiz = mongoose.model('Quiz', new Schema({
  title: String, description: String, moduleId: Schema.Types.ObjectId, courseId: Schema.Types.ObjectId,
  isFinalExam: Boolean, questions: [Schema.Types.ObjectId], totalPoints: Number, passingScore: Number, timeLimit: Number,
}, { timestamps: true }));
const Question = mongoose.model('Question', new Schema({
  question: String, type: String, quizId: Schema.Types.ObjectId, order: Number, points: Number, answers: [Schema.Types.ObjectId],
}, { timestamps: true }));
const Answer = mongoose.model('Answer', new Schema({
  answer: String, questionId: Schema.Types.ObjectId, isCorrect: Boolean, order: Number,
}, { timestamps: true }));
const Enrollment = mongoose.model('Enrollment', new Schema({
  employeeId: Number, courseId: Schema.Types.ObjectId, assignedBy: Number, status: String,
  assignedAt: Date, startedAt: Date, completedAt: Date, finalScore: Number,
}, { timestamps: true }));

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

// --- Helpers de création ---
async function createQuiz({ title, description, moduleId, courseId, isFinalExam, passingScore, questions }) {
  const quiz = await Quiz.create({ title, description, moduleId, courseId, isFinalExam: !!isFinalExam, passingScore: passingScore || 60, questions: [], totalPoints: 0, timeLimit: isFinalExam ? 20 : undefined });
  let total = 0;
  for (let i = 0; i < questions.length; i++) {
    const qs = questions[i];
    const points = qs.points || 1;
    const question = await Question.create({ question: qs.q, type: qs.type, quizId: quiz._id, order: i, points, answers: [] });
    const answerIds = [];
    for (let j = 0; j < qs.answers.length; j++) {
      const a = qs.answers[j];
      const ans = await Answer.create({ answer: a.text, questionId: question._id, isCorrect: !!a.correct, order: j });
      answerIds.push(ans._id);
    }
    question.answers = answerIds;
    await question.save();
    quiz.questions.push(question._id);
    total += points;
  }
  quiz.totalPoints = total;
  await quiz.save();
  return quiz;
}

async function createModule(courseId, order, title, description, sections, quizSpec) {
  const module = await Module.create({ title, description, courseId, order, sections: [] });
  const secIds = [];
  for (let i = 0; i < sections.length; i++) {
    const sp = sections[i];
    const sec = await Section.create({ title: sp.title, description: sp.description, moduleId: module._id, type: 'youtube', order: i, youtubeUrl: sp.url });
    secIds.push(sec._id);
  }
  module.sections = secIds;
  if (quizSpec) {
    const quiz = await createQuiz({ ...quizSpec, moduleId: module._id });
    module.quiz = quiz._id;
  }
  await module.save();
  return module;
}

async function cleanup(courseId, moduleIds) {
  const mods = await Module.find({ courseId }).lean();
  const allModuleIds = [...new Set([...(moduleIds || []), ...mods.map((m) => m._id)])];
  const quizzes = await Quiz.find({ $or: [{ courseId }, { moduleId: { $in: allModuleIds } }] }).lean();
  const quizIds = quizzes.map((q) => q._id);
  const questions = await Question.find({ quizId: { $in: quizIds } }).lean();
  const questionIds = questions.map((q) => q._id);
  await Answer.deleteMany({ questionId: { $in: questionIds } });
  await Question.deleteMany({ _id: { $in: questionIds } });
  await Quiz.deleteMany({ _id: { $in: quizIds } });
  await Section.deleteMany({ moduleId: { $in: allModuleIds } });
  await Module.deleteMany({ _id: { $in: allModuleIds } });
  await Enrollment.deleteMany({ courseId });
}

async function main() {
  await mongoose.connect(URI);
  console.log('✅ Connecté à MongoDB');

  // Idempotence : supprime un éventuel cours homonyme + ses enfants
  const existing = await Course.find({ title: COURSE_TITLE });
  for (const c of existing) {
    await cleanup(c._id);
    await Course.deleteOne({ _id: c._id });
    console.log('🧹 Ancien cours supprimé:', c._id.toString());
  }

  // Catégorie
  let category = await Category.findOne({ name: 'Développement logiciel' });
  if (!category) category = await Category.create({ name: 'Développement logiciel', description: 'Langages, paradigmes et bonnes pratiques de programmation.', instructorId: INSTRUCTOR_ID });

  // Cours
  const course = await Course.create({
    title: COURSE_TITLE,
    description:
      "Un parcours complet et progressif pour maîtriser la programmation orientée objet (POO) en Java. " +
      "À partir d'exemples concrets, ce cours couvre les classes et objets, l'encapsulation, l'héritage et le polymorphisme, " +
      "les classes abstraites et interfaces, puis la gestion des exceptions. À l'issue de l'examen final, la compétence Java " +
      "est attestée au niveau « Opérationnel » (niveau 2) et synchronisée automatiquement dans le profil de l'apprenant.",
    categoryId: category._id,
    instructorId: INSTRUCTOR_ID,
    instructorName: INSTRUCTOR_NAME,
    price: 0,
    status: 'published',
    modules: [],
    skillId: SKILL_ID,
    skillLevel: SKILL_LEVEL,
    companyId: COMPANY_ID,
  });

  const moduleIds = [];

  moduleIds.push((await createModule(course._id, 1, 'Module 1 — Classes et objets',
    "Le socle de la POO : définir une classe, instancier des objets, attributs, méthodes et constructeurs.",
    [{ title: 'Classes et objets en Java', description: "Introduction à la POO : classes, objets, attributs et méthodes.", url: yt('nxeibcPzO30') }],
    { title: 'Quiz — Classes et objets', questions: [
      { q: "En Java, qu'est-ce qu'une classe ?", type: 'qcm', answers: [
        { text: 'Un plan (modèle) décrivant les attributs et comportements des objets', correct: true },
        { text: 'Une instance concrète stockée en mémoire' },
        { text: 'Une variable de type primitif' },
        { text: 'Un mot-clé réservé du langage' } ] },
      { q: 'Le mot-clé utilisé pour créer un objet (instancier une classe) est « new ».', type: 'true_false', answers: [
        { text: 'Vrai', correct: true }, { text: 'Faux' } ] },
    ] }))._id);

  moduleIds.push((await createModule(course._id, 2, 'Module 2 — Encapsulation',
    "Protéger l'état interne d'un objet : visibilité private, accès contrôlé via getters et setters.",
    [
      { title: 'Encapsulation, visibilité, getters et setters', description: "Principe d'encapsulation et niveaux de visibilité.", url: yt('3qhoAYfk7cM') },
      { title: 'Getters et setters en pratique', description: "Mise en œuvre concrète des accesseurs.", url: yt('IzfpSrt4zq0') },
    ],
    { title: 'Quiz — Encapsulation', questions: [
      { q: "Quel modificateur de visibilité rend un attribut accessible uniquement depuis sa propre classe ?", type: 'qcm', answers: [
        { text: 'private', correct: true }, { text: 'public' }, { text: 'protected' }, { text: 'default (package)' } ] },
      { q: "À quoi sert un « getter » ?", type: 'qcm', answers: [
        { text: 'Lire (accéder en lecture) la valeur d\'un attribut privé', correct: true },
        { text: 'Modifier la valeur d\'un attribut' },
        { text: 'Supprimer un objet de la mémoire' },
        { text: 'Déclarer une nouvelle classe' } ] },
    ] }))._id);

  moduleIds.push((await createModule(course._id, 3, 'Module 3 — Héritage et polymorphisme',
    "Réutiliser et spécialiser : extends, super, redéfinition de méthodes (override) et polymorphisme.",
    [
      { title: 'Héritage et polymorphisme', description: "Généralisation/spécialisation et polymorphisme.", url: yt('fQbAOncfpcg') },
      { title: 'Héritage et polymorphisme (approfondissement)', description: "Exemples avancés.", url: yt('yqgRSxLrXGo') },
    ],
    { title: 'Quiz — Héritage et polymorphisme', questions: [
      { q: 'Quel mot-clé permet à une classe d\'hériter d\'une autre en Java ?', type: 'qcm', answers: [
        { text: 'extends', correct: true }, { text: 'implements' }, { text: 'inherits' }, { text: 'super' } ] },
      { q: 'Le polymorphisme permet à une variable de type parent de référencer un objet d\'une sous-classe.', type: 'true_false', answers: [
        { text: 'Vrai', correct: true }, { text: 'Faux' } ] },
    ] }))._id);

  moduleIds.push((await createModule(course._id, 4, 'Module 4 — Classes abstraites et interfaces',
    "Abstraction : classes abstraites, méthodes abstraites, interfaces et différences entre les deux.",
    [
      { title: 'Classes abstraites et interfaces', description: "Comparaison classe abstraite / interface.", url: yt('g1N10r_wlxM') },
      { title: 'Méthodes abstraites, classes abstraites et interfaces', description: "Cas d'usage et bonnes pratiques.", url: yt('rIuQHKjIjt4') },
    ],
    { title: 'Quiz — Abstraction', questions: [
      { q: 'Quelles affirmations sont vraies à propos des interfaces en Java ? (plusieurs réponses)', type: 'multiple_correct', answers: [
        { text: 'Une classe peut implémenter plusieurs interfaces', correct: true },
        { text: 'Une interface peut déclarer des méthodes sans corps (avant Java 8)', correct: true },
        { text: 'Une interface peut être instanciée directement avec new' },
        { text: 'On utilise le mot-clé implements pour réaliser une interface', correct: true } ] },
      { q: 'Une classe abstraite peut contenir à la fois des méthodes abstraites et des méthodes concrètes.', type: 'true_false', answers: [
        { text: 'Vrai', correct: true }, { text: 'Faux' } ] },
    ] }))._id);

  moduleIds.push((await createModule(course._id, 5, 'Module 5 — Gestion des exceptions',
    "Gérer les erreurs proprement : try / catch / finally, throw, throws, exceptions vérifiées et non vérifiées.",
    [
      { title: 'Exceptions : try, catch, finally', description: "Mécanisme de gestion des exceptions.", url: yt('wBk-NQiWhBc') },
      { title: 'Gestion des exceptions en Java', description: "Différentes manières de traiter les erreurs.", url: yt('MJ4uGIVdGzE') },
    ],
    { title: 'Quiz — Exceptions', questions: [
      { q: 'Quel bloc s\'exécute toujours, qu\'une exception soit levée ou non ?', type: 'qcm', answers: [
        { text: 'finally', correct: true }, { text: 'catch' }, { text: 'throw' }, { text: 'try' } ] },
      { q: 'Le mot-clé « throws » se place dans la signature d\'une méthode pour déclarer les exceptions qu\'elle peut propager.', type: 'true_false', answers: [
        { text: 'Vrai', correct: true }, { text: 'Faux' } ] },
    ] }))._id);

  // Examen final (8 questions, seuil 60%)
  const exam = await createQuiz({
    title: 'Examen final — Programmation Orientée Objet en Java',
    description: "Évaluation finale couvrant l'ensemble des modules. Seuil de réussite : 60 %. La réussite atteste la compétence Java au niveau Opérationnel (2).",
    courseId: course._id, isFinalExam: true, passingScore: 60,
    questions: [
      { q: 'Une instance créée à partir d\'une classe s\'appelle un(e) :', type: 'qcm', answers: [
        { text: 'objet', correct: true }, { text: 'paquetage' }, { text: 'thread' }, { text: 'annotation' } ] },
      { q: 'Quel principe consiste à masquer l\'état interne d\'un objet et à n\'y donner accès que par des méthodes ?', type: 'qcm', answers: [
        { text: 'L\'encapsulation', correct: true }, { text: 'L\'héritage' }, { text: 'Le polymorphisme' }, { text: 'La surcharge' } ] },
      { q: 'Quel mot-clé appelle le constructeur de la classe parente ?', type: 'qcm', answers: [
        { text: 'super', correct: true }, { text: 'this' }, { text: 'parent' }, { text: 'base' } ] },
      { q: 'Le polymorphisme permet de redéfinir (override) une méthode héritée dans une sous-classe.', type: 'true_false', answers: [
        { text: 'Vrai', correct: true }, { text: 'Faux' } ] },
      { q: 'Parmi ces propositions, lesquelles caractérisent une classe abstraite ? (plusieurs réponses)', type: 'multiple_correct', answers: [
        { text: 'Elle ne peut pas être instanciée directement', correct: true },
        { text: 'Elle peut contenir des méthodes abstraites', correct: true },
        { text: 'Elle peut contenir des méthodes concrètes', correct: true },
        { text: 'Elle supporte l\'héritage multiple comme les interfaces' } ] },
      { q: 'Quel bloc permet d\'intercepter et de traiter une exception ?', type: 'qcm', answers: [
        { text: 'catch', correct: true }, { text: 'finally' }, { text: 'throws' }, { text: 'switch' } ] },
      { q: 'En Java, une classe peut hériter de plusieurs classes en même temps (héritage multiple de classes).', type: 'true_false', answers: [
        { text: 'Vrai' }, { text: 'Faux', correct: true } ] },
      { q: 'Quels mots-clés sont liés à la gestion des exceptions ? (plusieurs réponses)', type: 'multiple_correct', answers: [
        { text: 'try', correct: true }, { text: 'catch', correct: true }, { text: 'finally', correct: true }, { text: 'extends' } ] },
    ],
  });

  course.modules = moduleIds;
  course.finalExam = exam._id;
  await course.save();

  // Inscription de l'apprenant démo (Houssine) — statut "assigné"
  await Enrollment.deleteMany({ employeeId: LEARNER_ID, courseId: course._id });
  await Enrollment.create({ employeeId: LEARNER_ID, courseId: course._id, assignedBy: INSTRUCTOR_ID, status: 'assigned', assignedAt: new Date() });

  console.log('\n✅ Cours seedé:', course.title);
  console.log('   courseId   :', course._id.toString());
  console.log('   modules    :', moduleIds.length, '| sections vidéo: 9 | quiz modules: 5');
  console.log('   examen final:', exam._id.toString(), '|', exam.questions.length, 'questions | seuil 60%');
  console.log('   skillId/level:', SKILL_ID, '/', SKILL_LEVEL, '| instructor:', INSTRUCTOR_ID, '| company:', COMPANY_ID);
  console.log('   inscription Houssine (#' + LEARNER_ID + '): status=assigned');

  await mongoose.disconnect();
  console.log('🔌 Déconnecté.');
}

main().catch((e) => { console.error('❌ Erreur seed:', e); process.exit(1); });
