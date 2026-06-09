'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { useConfirmDialog } from '../../../../hooks/useConfirmDialog';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  categoryId: Category;
  price: number;
  thumbnail?: string;
  status: 'draft' | 'published';
  modules: Module[];
  finalExam?: Quiz;
}

interface Module {
  _id: string;
  title: string;
  description?: string;
  order: number;
  sections: Section[];
  quiz?: Quiz;
}

interface Section {
  _id: string;
  title: string;
  description?: string;
  type: 'file' | 'youtube';
  order: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'word' | 'ppt' | 'video';
  youtubeUrl?: string;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  passingScore: number;
  timeLimit?: number;
}

interface Question {
  _id: string;
  question: string;
  type: 'qcm' | 'true_false' | 'multiple_correct';
  points: number;
  answers: Answer[];
  quizId?: string;
}

interface Answer {
  _id: string;
  answer: string;
  isCorrect: boolean;
  order?: number;
}

interface QuizWithQuestions extends Quiz {
  questions?: Question[];
}

export default function EditCoursePage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const courseId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const questionFormRef = useRef<HTMLDivElement>(null);
  const questionsListRef = useRef<{ [moduleId: string]: HTMLDivElement | null }>({});
  const [activeTab, setActiveTab] = useState<'modules' | 'final-exam'>('modules');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showAddModuleForm, setShowAddModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [showAddSectionForm, setShowAddSectionForm] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [newSectionType, setNewSectionType] = useState<'file' | 'youtube'>('file');
  const [newSectionFileType, setNewSectionFileType] = useState<'pdf' | 'word' | 'ppt'>('pdf');
  const [newSectionFile, setNewSectionFile] = useState<File | null>(null);
  const [newSectionYoutubeUrl, setNewSectionYoutubeUrl] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingModule, setDeletingModule] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionData, setEditingSectionData] = useState<Section | null>(null);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [showQuizForm, setShowQuizForm] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizPassingScore, setQuizPassingScore] = useState(60);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | undefined>(undefined);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<{ [quizId: string]: Question[] }>({});
  const [showQuestionForm, setShowQuestionForm] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [expandedQuizQuestions, setExpandedQuizQuestions] = useState<{ [moduleId: string]: boolean }>({});
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'qcm' | 'true_false' | 'multiple_correct'>('qcm');
  const [questionPoints, setQuestionPoints] = useState(1);
  const [questionAnswers, setQuestionAnswers] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  // Final Exam states
  const [showFinalExamForm, setShowFinalExamForm] = useState(false);
  const [finalExamTitle, setFinalExamTitle] = useState('');
  const [finalExamDescription, setFinalExamDescription] = useState('');
  const [finalExamPassingScore, setFinalExamPassingScore] = useState(60);
  const [finalExamTimeLimit, setFinalExamTimeLimit] = useState<number | undefined>(undefined);
  const [creatingFinalExam, setCreatingFinalExam] = useState(false);
  const [editingFinalExam, setEditingFinalExam] = useState(false);
  const [deletingFinalExam, setDeletingFinalExam] = useState(false);
  const [finalExamQuestions, setFinalExamQuestions] = useState<Question[]>([]);
  const [showFinalExamQuestionForm, setShowFinalExamQuestionForm] = useState(false);
  const [expandedFinalExamQuestions, setExpandedFinalExamQuestions] = useState(false);
  const finalExamQuestionsRef = useRef<HTMLDivElement>(null);
  const [publishingCourse, setPublishingCourse] = useState(false);
  const [showPublishedMessage, setShowPublishedMessage] = useState(false);
  const { dialog, showConfirm, closeDialog } = useConfirmDialog();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.user.role !== 'instructor') {
            router.push('/dashboard');
            return;
          }
          setUser(data.user);
          fetchCourse(token);
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      });
  }, [router, courseId]);

  const fetchCourse = async (token: string) => {
    try {
      if (!courseId) {
        console.error('Course ID is missing');
        return;
      }
      
      const res = await fetch(`/api/instructor/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error fetching course:', errorData);
        if (res.status === 404) {
          // Course not found
          router.push('/instructor/courses');
        }
        return;
      }
      
      const data = await res.json();
      setCourse(data.course);
      if (data.course.modules && data.course.modules.length > 0) {
        setExpandedModule(data.course.modules[0]._id);
        
        // Load quiz questions for all modules that have quizzes
        data.course.modules.forEach((module: Module) => {
          if (module.quiz) {
            // Handle both ObjectId string and populated quiz object
            const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
            if (quizId) {
              fetchQuizQuestions(quizId);
            }
          }
        });
      }
      
      // Load final exam questions if exists
      if (data.course.finalExam) {
        const finalExamId = typeof data.course.finalExam === 'string' ? data.course.finalExam : data.course.finalExam._id;
        if (finalExamId) {
          fetchFinalExamQuestions(finalExamId);
        }
        // If finalExam is a string (ObjectId), fetch full details
        if (typeof data.course.finalExam === 'string') {
          try {
            const examRes = await fetch(`/api/instructor/courses/${courseId}/final-exam`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (examRes.ok) {
              const examData = await examRes.json();
              if (examData.quiz) {
                // Update course state with populated exam
                setCourse(prev => prev ? { ...prev, finalExam: examData.quiz } : null);
              }
            }
          } catch (error) {
            console.error('Error fetching final exam details:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  const fetchFinalExamQuestions = async (finalExamId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/quizzes/${finalExamId}/questions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFinalExamQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching final exam questions:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleSettings = () => {
    setShowProfileDropdown(false);
    router.push('/instructor/settings');
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    setAddingModule(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/courses/${courseId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title: newModuleTitle.trim(),
          description: newModuleDescription.trim() || undefined,
        }),
      });

      if (res.ok) {
        setNewModuleTitle('');
        setNewModuleDescription('');
        setShowAddModuleForm(false);
        fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to create module');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setAddingModule(false);
    }
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section._id);
    setEditingSectionData(section);
    setNewSectionTitle(section.title);
    setNewSectionDescription(section.description || '');
    setNewSectionType(section.type);
    if (section.type === 'file') {
      setNewSectionFileType(section.fileType || 'pdf');
    } else {
      setNewSectionYoutubeUrl(section.youtubeUrl || '');
    }
    setShowAddSectionForm(null);
  };

  const handleUpdateSection = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    setAddingSection(true);
    try {
      const token = localStorage.getItem('token');
      
      let fileUrl = editingSectionData?.fileUrl || '';
      let fileName = editingSectionData?.fileName || '';
      let fileType = editingSectionData?.fileType || 'pdf';

      // Upload new file if a file was selected (only if editing and new file provided, or creating)
      if (newSectionType === 'file' && newSectionFile) {
        setUploadingFile(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', newSectionFile);

        const uploadRes = await fetch('/api/instructor/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          console.error(errorData.error || 'Failed to upload file');
          setUploadingFile(false);
          setAddingSection(false);
          return;
        }

        const uploadData = await uploadRes.json();
        fileUrl = uploadData.fileUrl;
        fileName = uploadData.fileName;
        
        const fileExtension = fileName.toLowerCase().split('.').pop();
        if (fileExtension === 'pdf') {
          fileType = 'pdf';
        } else if (fileExtension === 'doc' || fileExtension === 'docx') {
          fileType = 'word';
        } else if (fileExtension === 'ppt' || fileExtension === 'pptx') {
          fileType = 'ppt';
        }
        setUploadingFile(false);
      }

      const res = await fetch(`/api/instructor/sections/${sectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title: newSectionTitle.trim(),
          description: newSectionDescription.trim() || undefined,
          type: newSectionType,
          fileUrl: newSectionType === 'file' ? fileUrl : undefined,
          fileName: newSectionType === 'file' ? fileName : undefined,
          fileType: newSectionType === 'file' ? fileType : undefined,
          youtubeUrl: newSectionType === 'youtube' ? newSectionYoutubeUrl.trim() : undefined,
        }),
      });

      if (res.ok) {
        setNewSectionTitle('');
        setNewSectionDescription('');
        setNewSectionFile(null);
        setNewSectionYoutubeUrl('');
        setEditingSection(null);
        setEditingSectionData(null);
        fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to update section');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setAddingSection(false);
      setUploadingFile(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    showConfirm(
      'Are you sure you want to delete this section?',
      () => {
        performDeleteSection(sectionId);
      },
      {
        title: 'Delete Section',
        confirmText: 'Delete',
        confirmColor: 'red',
      }
    );
  };

  const performDeleteSection = async (sectionId: string) => {

    setDeletingSection(sectionId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/sections/${sectionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete section');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setDeletingSection(null);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;

    setCreatingQuiz(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/modules/${moduleId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: quizTitle.trim(),
          description: quizDescription.trim() || undefined,
          passingScore: quizPassingScore,
          timeLimit: quizTimeLimit || undefined,
        }),
      });

      if (res.ok) {
        const quizData = await res.json();
        setQuizTitle('');
        setQuizDescription('');
        setQuizPassingScore(60);
        setQuizTimeLimit(undefined);
        setShowQuizForm(null);
        setEditingQuiz(null);
        await fetchCourse(token!);
        // Load questions for the newly created/updated quiz
        if (quizData.quiz && quizData.quiz._id) {
          await fetchQuizQuestions(quizData.quiz._id);
        }
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to create quiz');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setCreatingQuiz(false);
    }
  };

  const fetchQuizQuestions = async (quizId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/quizzes/${quizId}/questions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(prev => ({ ...prev, [quizId]: data.questions || [] }));
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleEditQuiz = (moduleId: string) => {
    const module = course?.modules.find(m => m._id === moduleId);
    if (module?.quiz) {
      const quiz = typeof module.quiz === 'string' ? null : module.quiz;
      if (quiz) {
        setQuizTitle(quiz.title);
        setQuizDescription(quiz.description || '');
        setQuizPassingScore(quiz.passingScore || 60);
        setQuizTimeLimit(quiz.timeLimit);
        setEditingQuiz(moduleId);
        setShowQuizForm(moduleId);
      }
    }
  };

  const handleCreateFinalExam = async (e: React.FormEvent) => {
    e.preventDefault();

    setCreatingFinalExam(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/courses/${courseId}/final-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: course?.title ? `Final Exam - ${course.title}` : 'Final Exam',
          description: undefined,
          passingScore: finalExamPassingScore,
          timeLimit: finalExamTimeLimit || undefined,
        }),
      });

      if (res.ok) {
        const examData = await res.json();
        setFinalExamPassingScore(60);
        setFinalExamTimeLimit(undefined);
        setShowFinalExamForm(false);
        setEditingFinalExam(false);
        await fetchCourse(token!);
        // Load questions for the newly created/updated exam
        if (examData.quiz && examData.quiz._id) {
          await fetchFinalExamQuestions(examData.quiz._id);
        }
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to create final exam');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setCreatingFinalExam(false);
    }
  };

  const handleEditFinalExam = () => {
    if (course?.finalExam) {
      const exam = typeof course.finalExam === 'string' ? null : course.finalExam;
      if (exam) {
        setFinalExamPassingScore(exam.passingScore || 60);
        setFinalExamTimeLimit(exam.timeLimit);
        setEditingFinalExam(true);
        setShowFinalExamForm(true);
      }
    }
  };

  const handleDeleteFinalExam = async () => {
    showConfirm(
      'Are you sure you want to delete this final exam and all its questions? This action cannot be undone.',
      () => {
        performDeleteFinalExam();
      },
      {
        title: 'Delete Final Exam',
        confirmText: 'Delete',
        confirmColor: 'red',
      }
    );
  };

  const performDeleteFinalExam = async () => {

    setDeletingFinalExam(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/courses/${courseId}/final-exam`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setFinalExamQuestions([]);
        await fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete final exam');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setDeletingFinalExam(false);
    }
  };

  const handleAddFinalExamQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    if (questionType !== 'true_false' && questionAnswers.length < 2) {
      return;
    }
    if (questionType === 'true_false' && questionAnswers.length !== 2) {
      return;
    }

    if (!course?.finalExam) {
      return;
    }

    const finalExamId = typeof course.finalExam === 'string' ? course.finalExam : course.finalExam._id;

    setCreatingQuestion(true);
    try {
      const token = localStorage.getItem('token');
      
      // Create question
      const questionRes = await fetch(`/api/instructor/quizzes/${finalExamId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionText.trim(),
          type: questionType,
          points: questionPoints,
        }),
      });

      if (!questionRes.ok) {
        const errorData = await questionRes.json();
                                            console.error(errorData.error || 'Failed to create question');
        return;
      }

      const questionData = await questionRes.json();
      const newQuestionId = questionData.question._id;

      // Create answers
      if (questionType === 'true_false') {
        await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'True',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'true')?.isCorrect || false,
            order: 0,
          }),
        });

        await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'False',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'false')?.isCorrect || false,
            order: 1,
          }),
        });
      } else {
        for (let i = 0; i < questionAnswers.length; i++) {
          await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              answer: questionAnswers[i].text.trim(),
              isCorrect: questionAnswers[i].isCorrect,
              order: i,
            }),
          });
        }
      }

      // Reset form
      setQuestionText('');
      setQuestionType('qcm');
      setQuestionPoints(1);
      setQuestionAnswers([]);
      setEditingQuestion(null);
      setShowFinalExamQuestionForm(false);
      
      // Refresh questions
      await fetchFinalExamQuestions(finalExamId);
      await fetchCourse(token!);
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleUpdateFinalExamQuestion = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    if (questionType !== 'true_false' && questionAnswers.length < 2) {
      // Please add at least 2 answers
      return;
    }
    if (questionType === 'true_false' && questionAnswers.length !== 2) {
      // True/False questions must have exactly 2 answers
      return;
    }

    setCreatingQuestion(true);
    try {
      const token = localStorage.getItem('token');

      // Update question
      const questionRes = await fetch(`/api/instructor/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionText.trim(),
          type: questionType,
          points: questionPoints,
        }),
      });

      if (!questionRes.ok) {
        const errorData = await questionRes.json();
        console.error(errorData.error || 'Failed to update question');
        return;
      }

      // Fetch existing question to get answers
      const existingQuestionRes = await fetch(`/api/instructor/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const existingQuestionData = await existingQuestionRes.json();
      const existingQuestion = existingQuestionData.question;

      // Delete all existing answers
      if (existingQuestion.answers && existingQuestion.answers.length > 0) {
        for (const answer of existingQuestion.answers) {
          await fetch(`/api/instructor/answers/${answer._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      // Create new answers
      if (questionType === 'true_false') {
        await fetch(`/api/instructor/questions/${questionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'True',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'true')?.isCorrect || false,
            order: 0,
          }),
        });

        await fetch(`/api/instructor/questions/${questionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'False',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'false')?.isCorrect || false,
            order: 1,
          }),
        });
      } else {
        for (let i = 0; i < questionAnswers.length; i++) {
          await fetch(`/api/instructor/questions/${questionId}/answers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              answer: questionAnswers[i].text.trim(),
              isCorrect: questionAnswers[i].isCorrect,
              order: i,
            }),
          });
        }
      }

      // Reset form
      setQuestionText('');
      setQuestionType('qcm');
      setQuestionPoints(1);
      setQuestionAnswers([]);
      setEditingQuestion(null);
      setShowFinalExamQuestionForm(false);
      
      // Refresh questions
      if (course?.finalExam) {
        const finalExamId = typeof course.finalExam === 'string' ? course.finalExam : course.finalExam._id;
        await fetchFinalExamQuestions(finalExamId);
        await fetchCourse(token!);
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleDeleteFinalExamQuestion = async (questionId: string) => {
    showConfirm(
      'Are you sure you want to delete this question and all its answers?',
      () => {
        performDeleteFinalExamQuestion(questionId);
      },
      {
        title: 'Delete Question',
        confirmText: 'Delete',
        confirmColor: 'red',
      }
    );
  };

  const performDeleteFinalExamQuestion = async (questionId: string) => {

    setDeletingQuestion(questionId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        if (course?.finalExam) {
          const finalExamId = typeof course.finalExam === 'string' ? course.finalExam : course.finalExam._id;
          await fetchFinalExamQuestions(finalExamId);
          await fetchCourse(token!);
        }
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setDeletingQuestion(null);
    }
  };

  const handlePublishCourse = async () => {

    setPublishingCourse(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'published',
        }),
      });

      if (res.ok) {
        setShowPublishedMessage(true);
        await fetchCourse(token!);
        // Hide message after 5 seconds
        setTimeout(() => {
          setShowPublishedMessage(false);
        }, 5000);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to publish course');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setPublishingCourse(false);
    }
  };

  const handleDeleteQuiz = async (moduleId: string) => {
    showConfirm(
      'Are you sure you want to delete this quiz and all its questions? This action cannot be undone.',
      () => {
        performDeleteQuiz(moduleId);
      },
      {
        title: 'Delete Quiz',
        confirmText: 'Delete',
        confirmColor: 'red',
      }
    );
  };

  const performDeleteQuiz = async (moduleId: string) => {
    setDeletingQuiz(moduleId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/modules/${moduleId}/quiz`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Clear quiz questions from state
        const module = course?.modules.find(m => m._id === moduleId);
        if (module?.quiz) {
          const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
          setQuizQuestions(prev => {
            const newState = { ...prev };
            delete newState[quizId];
            return newState;
          });
        }
        await fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete quiz');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setDeletingQuiz(null);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent, quizId: string) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    if (questionType !== 'true_false' && questionAnswers.length < 2) {
      // Please add at least 2 answers
      return;
    }
    if (questionType === 'true_false' && questionAnswers.length !== 2) {
      // True/False questions must have exactly 2 answers
      return;
    }

    setCreatingQuestion(true);
    try {
      const token = localStorage.getItem('token');
      
      // Create question
      const questionRes = await fetch(`/api/instructor/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionText.trim(),
          type: questionType,
          points: questionPoints,
        }),
      });

      if (!questionRes.ok) {
        const errorData = await questionRes.json();
                                            console.error(errorData.error || 'Failed to create question');
        return;
      }

      const questionData = await questionRes.json();
      const newQuestionId = questionData.question._id;

      // Create answers
      if (questionType === 'true_false') {
        // For true/false, create True and False answers
        const trueAnswer = await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'True',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'true')?.isCorrect || false,
            order: 0,
          }),
        });

        const falseAnswer = await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'False',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'false')?.isCorrect || false,
            order: 1,
          }),
        });
      } else {
        // For QCM and multiple correct, create answers from form
        for (let i = 0; i < questionAnswers.length; i++) {
          await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              answer: questionAnswers[i].text.trim(),
              isCorrect: questionAnswers[i].isCorrect,
              order: i,
            }),
          });
        }
      }

      // Reset form
      setQuestionText('');
      setQuestionType('qcm');
      setQuestionPoints(1);
      setQuestionAnswers([]);
      setShowQuestionForm(null);
      
      // Refresh questions
      await fetchQuizQuestions(quizId);
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleEditQuestion = async (question: Question) => {
    try {
      const token = localStorage.getItem('token');
      // Fetch full question with answers
      const res = await fetch(`/api/instructor/questions/${question._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const fullQuestion = data.question;
        setEditingQuestion(fullQuestion._id);
        setQuestionText(fullQuestion.question);
        setQuestionType(fullQuestion.type);
        setQuestionPoints(fullQuestion.points);
        setQuestionAnswers(fullQuestion.answers.map((a: Answer) => ({ text: a.answer, isCorrect: a.isCorrect })));
        // Don't set showQuestionForm here, it will be set by the onClick handler
      }
    } catch (error) {
      console.error('Error loading question:', error);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent, questionId: string, quizId: string) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    setCreatingQuestion(true);
    try {
      const token = localStorage.getItem('token');
      
      // Update question
      const questionRes = await fetch(`/api/instructor/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionText.trim(),
          type: questionType,
          points: questionPoints,
        }),
      });

      if (!questionRes.ok) {
        const errorData = await questionRes.json();
        console.error(errorData.error || 'Failed to update question');
        return;
      }

      // Delete existing answers and create new ones
      const questionData = await questionRes.json();
      const existingQuestion = questionData.question;
      
      // Delete all existing answers
      if (existingQuestion.answers && existingQuestion.answers.length > 0) {
        for (const answerId of existingQuestion.answers) {
          await fetch(`/api/instructor/answers/${answerId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      }

      // Create new answers
      if (questionType === 'true_false') {
        const trueAnswer = await fetch(`/api/instructor/questions/${questionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'True',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'true')?.isCorrect || false,
            order: 0,
          }),
        });

        const falseAnswer = await fetch(`/api/instructor/questions/${questionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: 'False',
            isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'false')?.isCorrect || false,
            order: 1,
          }),
        });
      } else {
        for (let i = 0; i < questionAnswers.length; i++) {
          await fetch(`/api/instructor/questions/${questionId}/answers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              answer: questionAnswers[i].text.trim(),
              isCorrect: questionAnswers[i].isCorrect,
              order: i,
            }),
          });
        }
      }

      // Reset form
      setQuestionText('');
      setQuestionType('qcm');
      setQuestionPoints(1);
      setQuestionAnswers([]);
      setEditingQuestion(null);
      setShowQuestionForm(null);
      
      // Refresh questions
      await fetchQuizQuestions(quizId);
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, quizId: string) => {
    showConfirm(
      'Are you sure you want to delete this question?',
      () => {
        performDeleteQuestion(questionId, quizId);
      },
      {
        title: 'Delete Question',
        confirmText: 'Delete',
        confirmColor: 'red',
      }
    );
  };

  const performDeleteQuestion = async (questionId: string, quizId: string) => {

    setDeletingQuestion(questionId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await fetchQuizQuestions(quizId);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setDeletingQuestion(null);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    showConfirm(
      'Are you sure you want to delete this module? This action cannot be undone.',
      () => {
        performDeleteModule(moduleId);
      },
      {
        title: 'Delete Module',
        confirmText: 'Delete',
        confirmColor: 'red',
      }
    );
  };

  const performDeleteModule = async (moduleId: string) => {

    setDeletingModule(moduleId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructor/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete module');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setDeletingModule(null);
    }
  };

  const handleAddSection = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    if (newSectionType === 'file' && !newSectionFile) {
      return;
    }
    if (newSectionType === 'youtube' && !newSectionYoutubeUrl.trim()) {
      return;
    }

    setAddingSection(true);
    try {
      const token = localStorage.getItem('token');
      let fileUrl = '';
      let fileName = '';
      let fileType = '';

      // Upload file if type is file
      if (newSectionType === 'file' && newSectionFile) {
        setUploadingFile(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', newSectionFile);

        const uploadRes = await fetch('/api/instructor/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          console.error(errorData.error || 'Failed to upload file');
          setUploadingFile(false);
          setAddingSection(false);
          return;
        }

        const uploadData = await uploadRes.json();
        fileUrl = uploadData.fileUrl;
        fileName = uploadData.fileName;
        
        // Determine file type from extension
        const fileExtension = fileName.toLowerCase().split('.').pop();
        if (fileExtension === 'pdf') {
          fileType = 'pdf';
        } else if (fileExtension === 'doc' || fileExtension === 'docx') {
          fileType = 'word';
        } else if (fileExtension === 'ppt' || fileExtension === 'pptx') {
          fileType = 'ppt';
        }
        setUploadingFile(false);
      }

      const res = await fetch(`/api/instructor/modules/${moduleId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title: newSectionTitle.trim(),
          description: newSectionDescription.trim() || undefined,
          type: newSectionType,
          fileUrl: newSectionType === 'file' ? fileUrl : undefined,
          fileName: newSectionType === 'file' ? fileName : undefined,
          fileType: newSectionType === 'file' ? fileType : undefined,
          youtubeUrl: newSectionType === 'youtube' ? newSectionYoutubeUrl.trim() : undefined,
        }),
      });

      if (res.ok) {
        setNewSectionTitle('');
        setNewSectionDescription('');
        setNewSectionFile(null);
        setNewSectionYoutubeUrl('');
        setShowAddSectionForm(null);
        fetchCourse(token!);
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to create section');
      }
    } catch (error) {
      console.error('An error occurred. Please try again.');
    } finally {
      setAddingSection(false);
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !course) {
    return null;
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:fixed w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.08), 2px 0 10px rgba(0, 0, 0, 0.04)'
      }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Dar Al-Ilm Logo" className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dar Al-Ilm
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="space-y-1">
            <Link
              href="/instructor"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/instructor'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/instructor/courses"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/instructor/courses' || pathname.startsWith('/instructor/courses/')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              My Courses
            </Link>
            <Link
              href="/instructor/categories"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/instructor/categories'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Categories
            </Link>
            <Link
              href="/instructor/students"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/instructor/students'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Students
            </Link>
            <Link
              href="/instructor/analytics"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/instructor/analytics'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>
            <Link
              href="/instructor/settings"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/instructor/settings'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="w-full lg:ml-64 lg:w-[calc(100%-16rem)]">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 lg:left-64 z-30 backdrop-blur-sm bg-white/95" style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 10px rgba(0, 0, 0, 0.04)'
        }}>
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{course.title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={() => router.push('/instructor/courses')}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2 font-medium"
                  title="Back to Courses"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="hidden sm:inline">Back to Courses</span>
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all relative group">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                </button>
                
                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg ring-2 ring-white group-hover:ring-blue-200 transition-all">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                          <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => { setShowProfileDropdown(false); router.push('/instructor/profile'); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </button>
                          <button
                            onClick={handleSettings}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                          </button>
                        </div>
                        <div className="border-t border-gray-200 py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main 
          className="p-3 sm:p-4 pt-20 sm:pt-24 max-w-7xl mx-auto"
          onClick={() => setShowProfileDropdown(false)}
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'modules'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Modules & Sections
            </button>
            <button
              onClick={() => setActiveTab('final-exam')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'final-exam'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Final Exam
            </button>
          </div>

          {activeTab === 'modules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Course Modules</h2>
                {!showAddModuleForm && (
                  <button
                    onClick={() => setShowAddModuleForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    + Add Module
                  </button>
                )}
              </div>

              {showAddModuleForm && (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Add New Module</h3>
                  <form onSubmit={handleAddModule} className="space-y-4">
                    <div>
                      <label htmlFor="moduleTitle" className="block text-sm font-medium text-gray-700 mb-2">
                        Module Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="moduleTitle"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        placeholder="Enter module title"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="moduleDescription" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="moduleDescription"
                        value={newModuleDescription}
                        onChange={(e) => setNewModuleDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                        placeholder="Enter module description (optional)"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModuleForm(false);
                          setNewModuleTitle('');
                          setNewModuleDescription('');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingModule || !newModuleTitle.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingModule ? 'Adding...' : 'Add Module'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {course.modules && course.modules.length > 0 ? (
                <div className="space-y-3">
                  {course.modules.map((module) => (
                    <div key={module._id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-900 mb-1">{module.title}</h3>
                          {module.description && (
                            <p className="text-xs text-gray-600">{module.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteModule(module._id)}
                            disabled={deletingModule === module._id}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete module"
                          >
                            {deletingModule === module._id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => setExpandedModule(expandedModule === module._id ? null : module._id)}
                            className="p-1 text-gray-600 hover:text-gray-900"
                          >
                            <svg className={`w-5 h-5 transition-transform ${expandedModule === module._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {expandedModule === module._id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-gray-700">Sections</h4>
                            {!showAddSectionForm && (
                              <button 
                                onClick={() => setShowAddSectionForm(module._id)}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
                              >
                                + Add Section
                              </button>
                            )}
                          </div>

                          {(showAddSectionForm === module._id || editingSection) && (
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                              <h5 className="text-sm font-bold text-gray-900 mb-3">
                                {editingSection ? 'Edit Section' : 'Add New Section'}
                              </h5>
                              <form onSubmit={(e) => editingSection ? handleUpdateSection(e, editingSection) : handleAddSection(e, module._id)} className="space-y-3">
                                <div>
                                  <label htmlFor={`sectionTitle-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                    Section Title <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    id={`sectionTitle-${module._id}`}
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Enter section title"
                                    required
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`sectionDescription-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    id={`sectionDescription-${module._id}`}
                                    value={newSectionDescription}
                                    onChange={(e) => setNewSectionDescription(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    placeholder="Enter section description (optional)"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`sectionType-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                    Type <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    id={`sectionType-${module._id}`}
                                    value={newSectionType}
                                    onChange={(e) => setNewSectionType(e.target.value as 'file' | 'youtube')}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    required
                                  >
                                    <option value="file">File</option>
                                    <option value="youtube">YouTube</option>
                                  </select>
                                </div>
                                {newSectionType === 'file' && (
                                  <div>
                                    <label htmlFor={`fileInput-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                      Upload File {!editingSection && <span className="text-red-500">*</span>}
                                    </label>
                                    {editingSection && editingSectionData?.fileUrl && (
                                      <p className="text-xs text-gray-600 mb-2">
                                        Current file: <a href={editingSectionData.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{editingSectionData.fileName || 'View file'}</a>
                                      </p>
                                    )}
                                    <input
                                      type="file"
                                      id={`fileInput-${module._id}`}
                                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setNewSectionFile(file);
                                          // Auto-detect file type from extension
                                          const extension = file.name.toLowerCase().split('.').pop();
                                          if (extension === 'pdf') {
                                            setNewSectionFileType('pdf');
                                          } else if (extension === 'doc' || extension === 'docx') {
                                            setNewSectionFileType('word');
                                          } else if (extension === 'ppt' || extension === 'pptx') {
                                            setNewSectionFileType('ppt');
                                          }
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                      required={!editingSection}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      {editingSection ? 'Leave empty to keep current file, or select a new file to replace it.' : 'Select a file to upload'}
                                    </p>
                                    {newSectionFile && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        New file selected: {newSectionFile.name} ({(newSectionFile.size / 1024 / 1024).toFixed(2)} MB)
                                      </p>
                                    )}
                                  </div>
                                )}
                                {newSectionType === 'youtube' && (
                                  <div>
                                    <label htmlFor={`youtubeUrl-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                      YouTube URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="url"
                                      id={`youtubeUrl-${module._id}`}
                                      value={newSectionYoutubeUrl}
                                      onChange={(e) => setNewSectionYoutubeUrl(e.target.value)}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      required
                                    />
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAddSectionForm(null);
                                      setEditingSection(null);
                                      setEditingSectionData(null);
                                      setNewSectionTitle('');
                                      setNewSectionDescription('');
                                      setNewSectionFile(null);
                                      setNewSectionYoutubeUrl('');
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={addingSection || uploadingFile || !newSectionTitle.trim()}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {uploadingFile ? 'Uploading...' : addingSection ? 'Adding...' : 'Add Section'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                          
                          {module.sections && module.sections.length > 0 ? (
                            <div className="space-y-2">
                              {module.sections.map((section) => (
                                <div key={section._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">#{section.order}</span>
                                    <span className="text-sm text-gray-900">{section.title}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded ${
                                      section.type === 'file' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {section.type}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleEditSection(section)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                      title="Edit section"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteSection(section._id)}
                                      disabled={deletingSection === section._id}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                      title="Delete section"
                                    >
                                      {deletingSection === section._id ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 text-center py-4">No sections yet. Add your first section.</p>
                          )}

                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-semibold text-gray-700">Quiz</h4>
                              {!module.quiz && (
                                <button 
                                  onClick={() => {
                                    setShowQuizForm(module._id);
                                    setQuizTitle('');
                                    setQuizDescription('');
                                    setQuizPassingScore(60);
                                    setQuizTimeLimit(undefined);
                                  }}
                                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
                                >
                                  Create Quiz
                                </button>
                              )}
                            </div>
                            
                            {((!module.quiz && showQuizForm === module._id) || (module.quiz && editingQuiz === module._id && showQuizForm === module._id)) && (
                              <div className="mt-3 space-y-3">
                                <form onSubmit={(e) => handleCreateQuiz(e, module._id)} className="space-y-3">
                                  <div>
                                    <label htmlFor={`quizTitle-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                      Quiz Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      id={`quizTitle-${module._id}`}
                                      value={quizTitle}
                                      onChange={(e) => setQuizTitle(e.target.value)}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                      placeholder="Enter quiz title"
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`quizDescription-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                      Description
                                    </label>
                                    <textarea
                                      id={`quizDescription-${module._id}`}
                                      value={quizDescription}
                                      onChange={(e) => setQuizDescription(e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                      placeholder="Enter quiz description (optional)"
                                    />
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label htmlFor={`quizPassingScore-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                        Passing Score (%)
                                      </label>
                                      <input
                                        type="number"
                                        id={`quizPassingScore-${module._id}`}
                                        value={quizPassingScore}
                                        onChange={(e) => setQuizPassingScore(Number(e.target.value))}
                                        min="0"
                                        max="100"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label htmlFor={`quizTimeLimit-${module._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                                        Time Limit (minutes)
                                      </label>
                                      <input
                                        type="number"
                                        id={`quizTimeLimit-${module._id}`}
                                        value={quizTimeLimit || ''}
                                        onChange={(e) => setQuizTimeLimit(e.target.value ? Number(e.target.value) : undefined)}
                                        min="1"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Optional"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowQuizForm(null);
                                        setEditingQuiz(null);
                                        setQuizTitle('');
                                        setQuizDescription('');
                                        setQuizPassingScore(60);
                                        setQuizTimeLimit(undefined);
                                      }}
                                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={creatingQuiz || !quizTitle.trim()}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {creatingQuiz ? 'Saving...' : editingQuiz === module._id ? 'Update Quiz' : 'Create Quiz'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                                  
                            {/* Question form directly in quiz creation - only show if quiz doesn't exist yet */}
                            {!module.quiz && showQuizForm === module._id && (
                              <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3">
                                    <h6 className="text-xs font-bold text-gray-900 mb-3">Add Question</h6>
                                    <form onSubmit={async (e) => {
                                      e.preventDefault();
                                      if (!questionText.trim()) return;
                                      if (questionType !== 'true_false' && questionAnswers.length < 2) {
                                        // Please add at least 2 answers
                                        return;
                                      }
                                      if (questionType === 'true_false' && questionAnswers.length !== 2) {
                                        // True/False questions must have exactly 2 answers
                                        return;
                                      }

                                      // Create quiz first if it doesn't exist
                                      let currentQuizId = module.quiz?._id;
                                      if (!currentQuizId) {
                                          if (!quizTitle.trim()) {
                                            return;
                                          }
                                        
                                        setCreatingQuiz(true);
                                        try {
                                          const token = localStorage.getItem('token');
                                          const quizRes = await fetch(`/api/instructor/modules/${module._id}/quiz`, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({
                                              title: quizTitle.trim(),
                                              description: quizDescription.trim() || undefined,
                                              passingScore: quizPassingScore,
                                              timeLimit: quizTimeLimit || undefined,
                                            }),
                                          });

                                          if (!quizRes.ok) {
                                            const errorData = await quizRes.json().catch(() => ({ error: 'Failed to create quiz' }));
                                            console.error(errorData.error || 'Failed to create quiz');
                                            setCreatingQuiz(false);
                                            return;
                                          }

                                          const quizData = await quizRes.json();
                                          console.log('Quiz creation response:', quizData);
                                          
                                          // Handle different response structures
                                          let quizId = null;
                                          if (quizData.quiz && quizData.quiz !== null) {
                                            quizId = typeof quizData.quiz === 'string' 
                                              ? quizData.quiz 
                                              : (quizData.quiz._id || quizData.quiz);
                                          } else if (quizData._id) {
                                            quizId = quizData._id;
                                          }
                                          
                                          if (!quizId) {
                                            console.error('Invalid quiz response:', quizData);
                                            const errorMsg = quizData.error || 'Failed to create quiz: Invalid response format';
                                            console.error(errorMsg);
                                            setCreatingQuiz(false);
                                            return;
                                          }
                                          
                                          currentQuizId = quizId;
                                          setCreatingQuiz(false);
                                          
                                          // Refresh course data to get updated module with quiz
                                          await fetchCourse(token!);
                                          
                                          // Wait a bit for state to update
                                          await new Promise(resolve => setTimeout(resolve, 100));
                                        } catch (error: any) {
                                          console.error('Error creating quiz:', error);
                                            console.error(`An error occurred creating quiz: ${error.message || 'Please try again.'}`);
                                          setCreatingQuiz(false);
                                          return;
                                        } finally {
                                          setCreatingQuiz(false);
                                        }
                                      }

                                      // Add question
                                      setCreatingQuestion(true);
                                      try {
                                        const token = localStorage.getItem('token');
                                        
                                        // Create question
                                        const questionRes = await fetch(`/api/instructor/quizzes/${currentQuizId}/questions`, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            Authorization: `Bearer ${token}`,
                                          },
                                          body: JSON.stringify({
                                            question: questionText.trim(),
                                            type: questionType,
                                            points: questionPoints,
                                          }),
                                        });

                                        if (!questionRes.ok) {
                                          const errorData = await questionRes.json();
                                            console.error(errorData.error || 'Failed to create question');
                                          return;
                                        }

                                        const questionData = await questionRes.json();
                                        const newQuestionId = questionData.question._id;

                                        // Create answers
                                        if (questionType === 'true_false') {
                                          const trueAnswer = await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({
                                              answer: 'True',
                                              isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'true')?.isCorrect || false,
                                              order: 0,
                                            }),
                                          });

                                          const falseAnswer = await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({
                                              answer: 'False',
                                              isCorrect: questionAnswers.find(a => a.text.toLowerCase() === 'false')?.isCorrect || false,
                                              order: 1,
                                            }),
                                          });
                                        } else {
                                          for (let i = 0; i < questionAnswers.length; i++) {
                                            await fetch(`/api/instructor/questions/${newQuestionId}/answers`, {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                Authorization: `Bearer ${token}`,
                                              },
                                              body: JSON.stringify({
                                                answer: questionAnswers[i].text.trim(),
                                                isCorrect: questionAnswers[i].isCorrect,
                                                order: i,
                                              }),
                                            });
                                          }
                                        }

                                        // Reset form
                                        setQuestionText('');
                                        setQuestionType('qcm');
                                        setQuestionPoints(1);
                                        setQuestionAnswers([]);
                                        
                                        // Refresh questions
                                        await fetchQuizQuestions(currentQuizId);
                                        await fetchCourse(token!);
                                      } catch (error) {
                                        console.error('An error occurred. Please try again.');
                                      } finally {
                                        setCreatingQuestion(false);
                                      }
                                    }} className="space-y-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Question Text <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                          value={questionText}
                                          onChange={(e) => setQuestionText(e.target.value)}
                                          rows={2}
                                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                          placeholder="Enter your question"
                                          required
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Type <span className="text-red-500">*</span>
                                          </label>
                                          <select
                                            value={questionType}
                                            onChange={(e) => {
                                              setQuestionType(e.target.value as 'qcm' | 'true_false' | 'multiple_correct');
                                              if (e.target.value === 'true_false') {
                                                setQuestionAnswers([
                                                  { text: 'True', isCorrect: false },
                                                  { text: 'False', isCorrect: false }
                                                ]);
                                              } else {
                                                setQuestionAnswers([]);
                                              }
                                            }}
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            required
                                          >
                                            <option value="qcm">QCM (Single Choice)</option>
                                            <option value="true_false">True/False</option>
                                            <option value="multiple_correct">Multiple Correct</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Points
                                          </label>
                                          <input
                                            type="number"
                                            value={questionPoints}
                                            onChange={(e) => setQuestionPoints(Number(e.target.value))}
                                            min="1"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                          />
                                        </div>
                                      </div>
                                      
                                      {questionType !== 'true_false' && (
                                        <div>
                                          <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-medium text-gray-700">
                                              Answers <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => setQuestionAnswers([...questionAnswers, { text: '', isCorrect: false }])}
                                              className="text-xs text-blue-600 hover:text-blue-700"
                                            >
                                              + Add Answer
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {questionAnswers.map((answer, index) => (
                                              <div key={index} className="flex gap-2 items-center">
                                                <input
                                                  type="text"
                                                  value={answer.text}
                                                  onChange={(e) => {
                                                    const newAnswers = [...questionAnswers];
                                                    newAnswers[index].text = e.target.value;
                                                    setQuestionAnswers(newAnswers);
                                                  }}
                                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                  placeholder={`Answer ${index + 1}`}
                                                  required
                                                />
                                                <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={answer.isCorrect}
                                                    onChange={(e) => {
                                                      const newAnswers = [...questionAnswers];
                                                      newAnswers[index].isCorrect = e.target.checked;
                                                      setQuestionAnswers(newAnswers);
                                                    }}
                                                    className="w-4 h-4"
                                                  />
                                                  Correct
                                                </label>
                                                <button
                                                  type="button"
                                                  onClick={() => setQuestionAnswers(questionAnswers.filter((_, i) => i !== index))}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {questionType === 'true_false' && (
                                        <div className="space-y-2">
                                          {questionAnswers.map((answer, index) => (
                                            <label key={index} className="flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                              <input
                                                type="radio"
                                                name={`trueFalse-${module._id}`}
                                                checked={answer.isCorrect}
                                                onChange={() => {
                                                  const newAnswers = questionAnswers.map((a, i) => ({
                                                    ...a,
                                                    isCorrect: i === index
                                                  }));
                                                  setQuestionAnswers(newAnswers);
                                                }}
                                                className="w-4 h-4"
                                              />
                                              <span className="text-sm text-gray-700">{answer.text}</span>
                                            </label>
                                          ))}
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowQuizForm(null);
                                            setQuizTitle('');
                                            setQuizDescription('');
                                            setQuizPassingScore(60);
                                            setQuizTimeLimit(undefined);
                                            setQuestionText('');
                                            setQuestionType('qcm');
                                            setQuestionPoints(1);
                                            setQuestionAnswers([]);
                                          }}
                                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={creatingQuestion || creatingQuiz || !questionText.trim() || !quizTitle.trim() || (questionType !== 'true_false' && questionAnswers.length < 2)}
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {creatingQuiz ? 'Creating Quiz...' : creatingQuestion ? 'Adding...' : 'Add Question'}
                                        </button>
                                      </div>
                                    </form>
                              </div>
                            )}
                            
                            {module.quiz && (
                              <>
                                {/* Display quiz details */}
                                {(() => {
                                  const quiz = typeof module.quiz === 'string' ? null : module.quiz;
                                  if (quiz) {
                                    return (
                                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex-1">
                                            <h5 className="text-sm font-semibold text-gray-900">{quiz.title}</h5>
                                            {quiz.description && (
                                              <p className="text-xs text-gray-600 mt-1">{quiz.description}</p>
                                            )}
                                          </div>
                                          <div className="flex gap-2 ml-3">
                                            <button
                                              onClick={() => handleEditQuiz(module._id)}
                                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                              title="Edit quiz"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => handleDeleteQuiz(module._id)}
                                              disabled={deletingQuiz === module._id}
                                              className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                                              title="Delete quiz"
                                            >
                                              {deletingQuiz === module._id ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                              ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex gap-4 text-xs text-gray-600">
                                          <span>Passing Score: {quiz.passingScore}%</span>
                                          {quiz.timeLimit && <span>Time Limit: {quiz.timeLimit} min</span>}
                                        </div>
                                        
                                        {/* Questions dropdown toggle */}
                                        {(() => {
                                          const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
                                          const hasQuestions = quizQuestions[quizId] && quizQuestions[quizId].length > 0;
                                          const isExpanded = expandedQuizQuestions[module._id] || false;
                                          
                                          if (hasQuestions) {
                                            return (
                                              <button
                                                onClick={() => {
                                                  const willExpand = !expandedQuizQuestions[module._id];
                                                  setExpandedQuizQuestions(prev => ({
                                                    ...prev,
                                                    [module._id]: !prev[module._id]
                                                  }));
                                                  // Scroll to questions list if expanding
                                                  if (willExpand) {
                                                    setTimeout(() => {
                                                      const questionsDiv = questionsListRef.current[module._id];
                                                      if (questionsDiv) {
                                                        questionsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                      }
                                                    }, 100);
                                                  }
                                                }}
                                                className="mt-3 w-full flex items-center justify-between p-2 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors"
                                              >
                                                <span className="text-xs font-medium text-gray-700">
                                                  Questions ({quizQuestions[quizId].length})
                                                </span>
                                                <svg
                                                  className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                              </button>
                                            );
                                          }
                                          return null;
                                        })()}
                                        
                                        {/* Add Question button inside quiz card */}
                                        {!showQuestionForm && (
                                          <div className="mt-3 flex justify-end">
                                            <button
                                              onClick={() => {
                                                setShowQuestionForm(module._id);
                                                setQuestionText('');
                                                setQuestionType('qcm');
                                                setQuestionPoints(1);
                                                setQuestionAnswers([]);
                                                setEditingQuestion(null);
                                                const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
                                                if (!quizQuestions[quizId]) {
                                                  fetchQuizQuestions(quizId);
                                                }
                                                // Scroll to question form after a short delay to ensure it's rendered
                                                setTimeout(() => {
                                                  questionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }, 100);
                                              }}
                                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                            >
                                              + Add Question
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                
                                {/* Display questions if any - inside dropdown */}
                                {(() => {
                                  // Handle both ObjectId string and populated quiz object
                                  const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
                                  const hasQuestions = quizQuestions[quizId] && quizQuestions[quizId].length > 0;
                                  const isExpanded = expandedQuizQuestions[module._id] || false;
                                  
                                  return hasQuestions && isExpanded && (
                                  <div 
                                    ref={(el) => {
                                      if (el) {
                                        questionsListRef.current[module._id] = el;
                                      }
                                    }}
                                    className="mt-2 space-y-2 border-t border-gray-200 pt-2"
                                  >
                                    {quizQuestions[typeof module.quiz === 'string' ? module.quiz : module.quiz._id].map((q: Question, index: number) => (
                                      <div key={q._id} className="flex items-start justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-gray-500">Q{index + 1}:</span>
                                            <span className="text-sm text-gray-900">{q.question}</span>
                                            <span className={`px-2 py-0.5 text-xs rounded ${
                                              q.type === 'qcm' ? 'bg-blue-100 text-blue-700' :
                                              q.type === 'true_false' ? 'bg-green-100 text-green-700' :
                                              'bg-purple-100 text-purple-700'
                                            }`}>
                                              {q.type === 'qcm' ? 'QCM' : q.type === 'true_false' ? 'True/False' : 'Multiple'}
                                            </span>
                                            <span className="text-xs text-gray-500">({q.points} pts)</span>
                                          </div>
                                          {q.answers && q.answers.length > 0 && (
                                            <div className="ml-4 mt-1 space-y-1">
                                              {q.answers.map((a: Answer) => (
                                                <div key={a._id} className="text-xs text-gray-600">
                                                  {a.isCorrect ? '✓' : '○'} {a.answer}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => {
                                              handleEditQuestion(q);
                                              setShowQuestionForm(module._id);
                                              // Scroll to question form after a short delay
                                              setTimeout(() => {
                                                questionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                              }, 100);
                                            }}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit question"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
                                              handleDeleteQuestion(q._id, quizId);
                                            }}
                                            disabled={deletingQuestion === q._id}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                            title="Delete question"
                                          >
                                            {deletingQuestion === q._id ? (
                                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                              </svg>
                                            ) : (
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  );
                                })()}
                                
                                {showQuestionForm === module._id && (
                                  <div ref={questionFormRef} className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3">
                                    <h6 className="text-xs font-bold text-gray-900 mb-3">
                                      {editingQuestion ? 'Edit Question' : 'Add New Question'}
                                    </h6>
                                    <form onSubmit={(e) => {
                                      e.preventDefault();
                                      if (editingQuestion) {
                                        const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
                                        handleUpdateQuestion(e, editingQuestion, quizId);
                                      } else {
                                        const quizId = typeof module.quiz === 'string' ? module.quiz : module.quiz._id;
                                        handleAddQuestion(e, quizId);
                                      }
                                    }} className="space-y-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Question Text <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                          value={questionText}
                                          onChange={(e) => setQuestionText(e.target.value)}
                                          rows={2}
                                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                          placeholder="Enter your question"
                                          required
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Type <span className="text-red-500">*</span>
                                          </label>
                                          <select
                                            value={questionType}
                                            onChange={(e) => {
                                              setQuestionType(e.target.value as 'qcm' | 'true_false' | 'multiple_correct');
                                              if (e.target.value === 'true_false') {
                                                setQuestionAnswers([
                                                  { text: 'True', isCorrect: false },
                                                  { text: 'False', isCorrect: false }
                                                ]);
                                              } else {
                                                setQuestionAnswers([]);
                                              }
                                            }}
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            required
                                          >
                                            <option value="qcm">QCM (Single Choice)</option>
                                            <option value="true_false">True/False</option>
                                            <option value="multiple_correct">Multiple Correct</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Points
                                          </label>
                                          <input
                                            type="number"
                                            value={questionPoints}
                                            onChange={(e) => setQuestionPoints(Number(e.target.value))}
                                            min="1"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                          />
                                        </div>
                                      </div>
                                      
                                      {questionType !== 'true_false' && (
                                        <div>
                                          <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-medium text-gray-700">
                                              Answers <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => setQuestionAnswers([...questionAnswers, { text: '', isCorrect: false }])}
                                              className="text-xs text-blue-600 hover:text-blue-700"
                                            >
                                              + Add Answer
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {questionAnswers.map((answer, index) => (
                                              <div key={index} className="flex gap-2 items-center">
                                                <input
                                                  type="text"
                                                  value={answer.text}
                                                  onChange={(e) => {
                                                    const newAnswers = [...questionAnswers];
                                                    newAnswers[index].text = e.target.value;
                                                    setQuestionAnswers(newAnswers);
                                                  }}
                                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                  placeholder={`Answer ${index + 1}`}
                                                  required
                                                />
                                                <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={answer.isCorrect}
                                                    onChange={(e) => {
                                                      const newAnswers = [...questionAnswers];
                                                      newAnswers[index].isCorrect = e.target.checked;
                                                      setQuestionAnswers(newAnswers);
                                                    }}
                                                    className="w-4 h-4"
                                                  />
                                                  Correct
                                                </label>
                                                <button
                                                  type="button"
                                                  onClick={() => setQuestionAnswers(questionAnswers.filter((_, i) => i !== index))}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {questionType === 'true_false' && (
                                        <div className="space-y-2">
                                          {questionAnswers.map((answer, index) => (
                                            <label key={index} className="flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                              <input
                                                type="radio"
                                                name="trueFalse"
                                                checked={answer.isCorrect}
                                                onChange={() => {
                                                  const newAnswers = questionAnswers.map((a, i) => ({
                                                    ...a,
                                                    isCorrect: i === index
                                                  }));
                                                  setQuestionAnswers(newAnswers);
                                                }}
                                                className="w-4 h-4"
                                              />
                                              <span className="text-sm text-gray-700">{answer.text}</span>
                                            </label>
                                          ))}
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowQuestionForm(null);
                                            setEditingQuestion(null);
                                            setQuestionText('');
                                            setQuestionType('qcm');
                                            setQuestionPoints(1);
                                            setQuestionAnswers([]);
                                          }}
                                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={creatingQuestion || !questionText.trim() || (questionType !== 'true_false' && questionAnswers.length < 2)}
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {creatingQuestion ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
                                        </button>
                                      </div>
                                    </form>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No modules yet</p>
                  <p className="text-xs text-gray-500 mb-4">Add your first module to start building your course</p>
                  <button
                    onClick={() => setShowAddModuleForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Add Module
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'final-exam' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Final Exam</h2>
              </div>

              {/* Final Exam Form */}
              {((!course.finalExam && showFinalExamForm) || (course.finalExam && editingFinalExam && showFinalExamForm)) && (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <form onSubmit={handleCreateFinalExam} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="finalExamPassingScore" className="block text-sm font-medium text-gray-700 mb-2">
                          Passing Score (%)
                        </label>
                        <input
                          type="number"
                          id="finalExamPassingScore"
                          value={finalExamPassingScore}
                          onChange={(e) => setFinalExamPassingScore(Number(e.target.value))}
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="finalExamTimeLimit" className="block text-sm font-medium text-gray-700 mb-2">
                          Time Limit (minutes)
                        </label>
                        <input
                          type="number"
                          id="finalExamTimeLimit"
                          value={finalExamTimeLimit || ''}
                          onChange={(e) => setFinalExamTimeLimit(e.target.value ? Number(e.target.value) : undefined)}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFinalExamForm(false);
                          setEditingFinalExam(false);
                          setFinalExamPassingScore(60);
                          setFinalExamTimeLimit(undefined);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={creatingFinalExam}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingFinalExam ? 'Saving...' : editingFinalExam ? 'Update' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            // If exam doesn't exist, create it first
                            if (!course.finalExam) {
                              const token = localStorage.getItem('token');
                              try {
                                const res = await fetch(`/api/instructor/courses/${courseId}/final-exam`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    title: course?.title ? `Final Exam - ${course.title}` : 'Final Exam',
                                    description: undefined,
                                    passingScore: finalExamPassingScore,
                                    timeLimit: finalExamTimeLimit || undefined,
                                  }),
                                });
                                if (res.ok) {
                                  await fetchCourse(token!);
                                  const examData = await res.json();
                                  if (examData.quiz && examData.quiz._id) {
                                    await fetchFinalExamQuestions(examData.quiz._id);
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to create exam. Please try again.');
                                return;
                              }
                            }
                            setShowFinalExamQuestionForm(true);
                            setQuestionText('');
                            setQuestionType('qcm');
                            setQuestionPoints(1);
                            setQuestionAnswers([]);
                            setEditingQuestion(null);
                            setTimeout(() => {
                              questionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                        >
                          + Add Question
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Final Exam Display */}
              {course.finalExam && !showFinalExamForm && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  {(() => {
                    const exam = typeof course.finalExam === 'string' ? null : course.finalExam;
                    // If exam is a string (ObjectId), show loading or basic info
                    if (!exam && typeof course.finalExam === 'string') {
                      return (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600">Loading exam details...</p>
                        </div>
                      );
                    }
                    if (exam) {
                      return (
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-gray-900">{exam.title || 'Final Exam'}</h3>
                              {exam.description && (
                                <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-3">
                              <button
                                onClick={handleEditFinalExam}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                title="Edit exam"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={handleDeleteFinalExam}
                                disabled={deletingFinalExam}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                                title="Delete exam"
                              >
                                {deletingFinalExam ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600 mb-3">
                            <span>Passing Score: {exam.passingScore}%</span>
                            {exam.timeLimit && <span>Time Limit: {exam.timeLimit} min</span>}
                          </div>
                          
                          {/* Questions dropdown toggle */}
                          {finalExamQuestions.length > 0 && (
                            <button
                              onClick={() => {
                                const willExpand = !expandedFinalExamQuestions;
                                setExpandedFinalExamQuestions(!expandedFinalExamQuestions);
                                if (willExpand) {
                                  setTimeout(() => {
                                    if (finalExamQuestionsRef.current) {
                                      finalExamQuestionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                  }, 100);
                                }
                              }}
                              className="w-full flex items-center justify-between p-2 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                Questions ({finalExamQuestions.length})
                              </span>
                              <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${expandedFinalExamQuestions ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Add Question button */}
                          {!showFinalExamQuestionForm && (
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => {
                                  setShowFinalExamQuestionForm(true);
                                  setQuestionText('');
                                  setQuestionType('qcm');
                                  setQuestionPoints(1);
                                  setQuestionAnswers([]);
                                  setEditingQuestion(null);
                                  setTimeout(() => {
                                    questionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                              >
                                + Add Question
                              </button>
                            </div>
                          )}
                        </>
                      );
                    }
                    return null;
                  })()}
                  </div>
                  
                  {/* Publish Course Button */}
                  {course.status !== 'published' && (
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">Ready to Publish?</h4>
                          <p className="text-sm text-gray-600">Your course has a final exam. You can now publish it to make it available to students.</p>
                        </div>
                        <button
                          onClick={handlePublishCourse}
                          disabled={publishingCourse}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {publishingCourse ? (
                            <>
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Publishing...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Publish Course
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {course.status === 'published' && showPublishedMessage && (
                    <div className="bg-green-50 rounded-lg border border-green-200 p-4 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-green-800">Course is published and available to students.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display questions if any - inside dropdown */}
              {course.finalExam && expandedFinalExamQuestions && finalExamQuestions.length > 0 && (
                <div 
                  ref={finalExamQuestionsRef}
                  className="bg-white rounded-lg border border-gray-200 p-4 space-y-2"
                >
                  {finalExamQuestions.map((q: Question, index: number) => (
                    <div key={q._id} className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">Q{index + 1}:</span>
                          <span className="text-sm text-gray-900">{q.question}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            q.type === 'qcm' ? 'bg-blue-100 text-blue-700' :
                            q.type === 'true_false' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {q.type === 'qcm' ? 'QCM' : q.type === 'true_false' ? 'True/False' : 'Multiple'}
                          </span>
                          <span className="text-xs text-gray-500">({q.points} pts)</span>
                        </div>
                        {q.answers && q.answers.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {q.answers.map((a: Answer) => (
                              <div key={a._id} className="text-xs text-gray-600">
                                {a.isCorrect ? '✓' : '○'} {a.answer}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            handleEditQuestion(q);
                            setShowFinalExamQuestionForm(true);
                            setTimeout(() => {
                              questionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit question"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteFinalExamQuestion(q._id)}
                          disabled={deletingQuestion === q._id}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete question"
                        >
                          {deletingQuestion === q._id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Question Form for Final Exam */}
              {course.finalExam && showFinalExamQuestionForm && (
                <div ref={questionFormRef} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h6 className="text-sm font-bold text-gray-900 mb-3">
                    {editingQuestion ? 'Edit Question' : 'Add New Question'}
                  </h6>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (editingQuestion) {
                      handleUpdateFinalExamQuestion(e, editingQuestion);
                    } else {
                      handleAddFinalExamQuestion(e);
                    }
                  }} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Question Text <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                        placeholder="Enter your question"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={questionType}
                          onChange={(e) => {
                            setQuestionType(e.target.value as 'qcm' | 'true_false' | 'multiple_correct');
                            if (e.target.value === 'true_false') {
                              setQuestionAnswers([
                                { text: 'True', isCorrect: false },
                                { text: 'False', isCorrect: false }
                              ]);
                            } else {
                              setQuestionAnswers([]);
                            }
                          }}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          required
                        >
                          <option value="qcm">QCM (Single Choice)</option>
                          <option value="true_false">True/False</option>
                          <option value="multiple_correct">Multiple Correct</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          value={questionPoints}
                          onChange={(e) => setQuestionPoints(Number(e.target.value))}
                          min="1"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    
                    {questionType !== 'true_false' && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-medium text-gray-700">
                            Answers <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setQuestionAnswers([...questionAnswers, { text: '', isCorrect: false }])}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            + Add Answer
                          </button>
                        </div>
                        <div className="space-y-2">
                          {questionAnswers.map((answer, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={answer.text}
                                onChange={(e) => {
                                  const newAnswers = [...questionAnswers];
                                  newAnswers[index].text = e.target.value;
                                  setQuestionAnswers(newAnswers);
                                }}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder={`Answer ${index + 1}`}
                                required
                              />
                              <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={answer.isCorrect}
                                  onChange={(e) => {
                                    const newAnswers = [...questionAnswers];
                                    newAnswers[index].isCorrect = e.target.checked;
                                    setQuestionAnswers(newAnswers);
                                  }}
                                  className="w-4 h-4"
                                />
                                Correct
                              </label>
                              <button
                                type="button"
                                onClick={() => setQuestionAnswers(questionAnswers.filter((_, i) => i !== index))}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {questionType === 'true_false' && (
                      <div className="space-y-2">
                        {questionAnswers.map((answer, index) => (
                          <label key={index} className="flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="trueFalseFinalExam"
                              checked={answer.isCorrect}
                              onChange={() => {
                                const newAnswers = questionAnswers.map((a, i) => ({
                                  ...a,
                                  isCorrect: i === index
                                }));
                                setQuestionAnswers(newAnswers);
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">{answer.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFinalExamQuestionForm(false);
                          setEditingQuestion(null);
                          setQuestionText('');
                          setQuestionType('qcm');
                          setQuestionPoints(1);
                          setQuestionAnswers([]);
                        }}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingQuestion || !questionText.trim() || (questionType !== 'true_false' && questionAnswers.length < 2) || (questionType !== 'true_false' && !questionAnswers.some(a => a.isCorrect))}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingQuestion ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Empty State */}
              {!course.finalExam && !showFinalExamForm && (
                <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No final exam yet</p>
                  <p className="text-xs text-gray-500 mb-4">Create a final exam for this course</p>
                  <button 
                    onClick={() => {
                      setShowFinalExamForm(true);
                      setFinalExamTitle('');
                      setFinalExamDescription('');
                      setFinalExamPassingScore(60);
                      setFinalExamTimeLimit(undefined);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Create Final Exam
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {dialog && (
        <ConfirmDialog
          isOpen={dialog.isOpen}
          title={dialog.title}
          message={dialog.message}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          confirmColor={dialog.confirmColor}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
    </>
  );
}


