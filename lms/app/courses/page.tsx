'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructorName?: string;
  skillLevel?: number;
  status: string;
  categoryId?: { _id: string; name: string } | string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/courses?limit=100')
      .then((res) => res.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : data.courses || []);
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(
    (c) => c.status === 'published' && c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RecruitPRO Academy
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600">
            Mon espace
          </Link>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Catalogue des formations</h1>
          <p className="text-gray-600">Montez en compétence avec les parcours conçus par vos formateurs internes.</p>
        </div>

        <div className="mb-8 max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une formation..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-bold">Aucune formation publiée pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => {
              const categoryName =
                typeof course.categoryId === 'object' && course.categoryId
                  ? course.categoryId.name
                  : null;
              return (
                <Link
                  key={course._id}
                  href={`/courses/${course._id}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-4xl font-black">{course.title[0]}</span>
                    </div>
                  )}
                  <div className="p-5">
                    {categoryName && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{categoryName}</span>
                    )}
                    <h3 className="font-bold text-gray-900 mt-1 mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{course.instructorName || 'Formateur'}</span>
                      {course.skillLevel && (
                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">
                          Niv. {course.skillLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
