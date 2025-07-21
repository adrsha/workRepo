"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from "../../styles/teacherVideos.module.css";

// ===================== HOOKS =====================

const useThumbnailGenerator = () => {
    const generateThumbnail = (videoPath) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.currentTime = 1;
            
            video.onloadedmetadata = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                video.onseeked = () => {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataURL);
                };
            };
            
            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = videoPath;
            video.load();
        });
    };

    return { generateThumbnail };
};

const useTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [thumbnailCache, setThumbnailCache] = useState(new Map());
    const { generateThumbnail } = useThumbnailGenerator();

    const fetchTeachers = async (videoOnly = true) => {
        setLoading(true);
        setError('');

        try {
            const url = videoOnly 
                ? '/api/teacherDetails?video_only=true' 
                : '/api/teacherDetails';
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch teachers`);
            }

            const data = await response.json();
            if (data && data.teachers) {
                console.log('Teacher data:', data.teachers);
                setTeachers(data.teachers);
                
                // Generate thumbnails for teachers with videos but no thumbnails
                data.teachers.forEach(async (teacher) => {
                    if (teacher.video_path && !thumbnailCache.has(teacher.user_id)) {
                        try {
                            const thumbnail = await generateThumbnail(teacher.video_path);
                            setThumbnailCache(prev => new Map(prev.set(teacher.user_id, thumbnail)));
                        } catch (err) {
                            console.warn(`Failed to generate thumbnail for teacher ${teacher.user_id}:`, err);
                        }
                    }
                });
            }
            
        } catch (err) {
            setError(err.message);
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeacherById = async (teacherId) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/teacherDetails?teacher_id=${teacherId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch teacher`);
            }

            const data = await response.json();
            if (data && data.teachers && data.teachers.length > 0) {
                const teacher = data.teachers[0];
                
                if (teacher.video_path && !thumbnailCache.has(teacher.user_id)) {
                    try {
                        const thumbnail = await generateThumbnail(teacher.video_path);
                        setThumbnailCache(prev => new Map(prev.set(teacher.user_id, thumbnail)));
                    } catch (err) {
                        console.warn(`Failed to generate thumbnail for teacher ${teacher.user_id}:`, err);
                    }
                }
                
                return teacher;
            } else {
                throw new Error('Teacher not found');
            }
            
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { 
        teachers, 
        loading, 
        error, 
        fetchTeachers, 
        fetchTeacherById,
        thumbnailCache 
    };
};

const useVideoPlayer = () => {
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const selectTeacher = (teacher) => {
        setSelectedTeacher(teacher);
        setIsPlaying(true);
    };

    const closeVideo = () => {
        setSelectedTeacher(null);
        setIsPlaying(false);
    };

    return { selectedTeacher, isPlaying, selectTeacher, closeVideo };
};

// ===================== UTILS =====================

const filterTeachers = (teachers, searchTerm) => {
    if (!searchTerm) return teachers;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return teachers.filter(teacher => 
        teacher.user_name?.toLowerCase().includes(lowercaseSearch) ||
        teacher.qualification?.toLowerCase().includes(lowercaseSearch) ||
        teacher.courses?.some(course => course.toLowerCase().includes(lowercaseSearch))
    );
};

// ===================== COMPONENTS =====================

const VideoPlayer = ({ teacher, onClose }) => {
    if (!teacher) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.videoModal} onClick={handleOverlayClick}>
            <div className={styles.videoContainer}>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>
                <video
                    src={teacher.video_path}
                    controls
                    autoPlay
                    className={styles.videoPlayer}
                >
                    Your browser does not support the video tag.
                </video>
                <div className={styles.videoInfo}>
                    <h4>{teacher.user_name || 'Unknown Teacher'}</h4>
                    <div className={styles.teacherDetails}>
                        {teacher.qualification && (
                            <p><strong>Qualification:</strong> {teacher.qualification}</p>
                        )}
                        {teacher.experience && (
                            <p><strong>Experience:</strong> {teacher.experience}</p>
                        )}
                        {teacher.classes_count > 0 && (
                            <p><strong>Classes:</strong> {teacher.classes_count}</p>
                        )}
                        {teacher.students_count > 0 && (
                            <p><strong>Students:</strong> {teacher.students_count}</p>
                        )}
                        {teacher.courses && teacher.courses.length > 0 && (
                            <p><strong>Courses:</strong> {teacher.courses.join(', ')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VideoThumbnail = ({ teacher, thumbnailCache }) => {
    const [imgError, setImgError] = useState(false);
    
    const getThumbnailSrc = () => {
        if (teacher.thumbnail && !imgError) {
            return teacher.thumbnail;
        }
        if (thumbnailCache.has(teacher.user_id)) {
            return thumbnailCache.get(teacher.user_id);
        }
        return null;
    };

    const thumbnailSrc = getThumbnailSrc();

    const handleImageError = () => {
        setImgError(true);
    };

    if (thumbnailSrc) {
        return (
            <img
                src={thumbnailSrc}
                alt={`${teacher.user_name} video thumbnail`}
                className={styles.thumbnailImg}
                onError={handleImageError}
            />
        );
    }

    return (
        <div className={styles.placeholderThumb}>
            <div className={styles.placeholderIcon}>📹</div>
            <span>Video Preview</span>
        </div>
    );
};

const TeacherCard = ({ teacher, onSelect, thumbnailCache }) => {
    const handleCardClick = () => {
        onSelect?.(teacher);
    };
    const router = useRouter();

    return (
        <div className={styles.card}>
            <div className={styles.thumb} onClick={handleCardClick}>
                <VideoThumbnail teacher={teacher} thumbnailCache={thumbnailCache} />
                <div className={styles.overlay}>▶</div>
            </div>
            <div className={styles.cardInfo}>
                <div className={styles.teacherName} onClick={()=>router.push(`/profile/${teacher.user_id}`)}>
                    {teacher.user_name || 'Unknown Teacher'}
                </div>
                <div className={styles.teacherMeta}>
                    {teacher.qualification && (
                        <div className={styles.qualification}>
                            <strong> Qualification:</strong> {teacher.qualification}
                        </div>
                    )}
                    {teacher.experience && (
                        <div className={styles.experience}>
                            <strong> Experience:</strong> {teacher.experience}
                        </div>
                    )}
                    <div className={styles.stats}>
                        {teacher.classes_count > 0 && (
                            <span className={styles.stat}>
                                📚 {teacher.classes_count} classes
                            </span>
                        )}
                        {teacher.students_count > 0 && (
                            <span className={styles.stat}>
                                👥 {teacher.students_count} students
                            </span>
                        )}
                    </div>
                    {teacher.courses && teacher.courses.length > 0 && (
                        <div className={styles.courses}>
                            <strong>Courses:</strong> {teacher.courses.slice(0, 2).join(', ')}
                            {teacher.courses.length > 2 && '...'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeacherSearch = ({ search, onSearchChange }) => {
    return (
        <div className={styles.search}>
            <input
                type="text"
                placeholder="Search teachers by name, qualification, or course"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    );
};

const TeacherHeader = ({ loading, onRefresh, title = "Teacher Introduction Videos" }) => {
    return (
        <div className={styles.header}>
            <h3>{title}</h3>
            <button onClick={onRefresh} disabled={loading}>
                {loading ? '⟳' : '↻'}
            </button>
        </div>
    );
};

const ErrorDisplay = ({ error }) => {
    if (!error) return null;
    
    return (
        <div className={styles.error}>
            ⚠ {error}
        </div>
    );
};

const LoadingDisplay = () => {
    return (
        <div className={styles.loading}>
            Loading teachers...
        </div>
    );
};

const EmptyState = ({ search }) => {
    return (
        <div className={styles.empty}>
            {search ? 'No matching teacher videos' : 'No teacher videos found'}
        </div>
    );
};

const TeacherGrid = ({ teachers, onTeacherSelect, thumbnailCache }) => {
    return (
        <div className={styles.grid}>
            {teachers.map(teacher => (
                <TeacherCard
                    key={teacher.user_id}
                    teacher={teacher}
                    onSelect={onTeacherSelect}
                    thumbnailCache={thumbnailCache}
                />
            ))}
        </div>
    );
};

// Component that directly shows a video player for a specific teacher (video only)
export const TeacherVideoPlayer = ({ teacherId, autoPlay = true, className = '' }) => {
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchTeacher = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/teacherDetails?teacher_id=${teacherId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch teacher`);
            }

            const data = await response.json();
            if (data && data.teachers && data.teachers.length > 0) {
                setTeacher(data.teachers[0]);
            } else {
                throw new Error('Teacher not found');
            }
            
        } catch (err) {
            setError(err.message);
            setTeacher(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teacherId) {
            fetchTeacher();
        }
    }, [teacherId]);

    if (loading) {
        return <LoadingDisplay />;
    }

    if (error) {
        return <ErrorDisplay error={error} />;
    }

    if (!teacher || !teacher.video_path) {
        return <EmptyState search={false} />;
    }

    return (
        <div className={`${styles.inlineVideoContainer} ${className}`}>
            <video
                src={teacher.video_path}
                controls
                autoPlay={autoPlay}
                className={styles.inlineVideoPlayer}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

// // Wrapper component that shows video with teacher details
// export const TeacherVideoWithDetails = ({ teacherId, autoPlay = true, className = '' }) => {
//     const [teacher, setTeacher] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');
//
//     const fetchTeacher = async () => {
//         setLoading(true);
//         setError('');
//
//         try {
//             const response = await fetch(`/api/teacherDetails?teacher_id=${teacherId}`);
//
//             if (!response.ok) {
//                 throw new Error(`HTTP ${response.status}: Failed to fetch teacher`);
//             }
//
//             const data = await response.json();
//             if (data && data.teachers && data.teachers.length > 0) {
//                 setTeacher(data.teachers[0]);
//             } else {
//                 throw new Error('Teacher not found');
//             }
//             
//         } catch (err) {
//             setError(err.message);
//             setTeacher(null);
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     useEffect(() => {
//         if (teacherId) {
//             fetchTeacher();
//         }
//     }, [teacherId]);
//
//     if (loading) {
//         return <LoadingDisplay />;
//     }
//
//     if (error) {
//         return <ErrorDisplay error={error} />;
//     }
//
//     if (!teacher || !teacher.video_path) {
//         return <EmptyState search={false} />;
//     }
//
//     return (
//         <div className={`${styles.inlineVideoContainer} ${className}`}>
//             <TeacherVideoPlayer teacherId={teacherId} autoPlay={autoPlay} />
//             <div className={styles.inlineTeacherInfo}>
//                 <h4>{teacher.user_name}</h4>
//                 {teacher.qualification && <p>🎓 {teacher.qualification}</p>}
//                 {teacher.experience && <p>💼 {teacher.experience}</p>}
//             </div>
//         </div>
//     );
// };
//
// Main component for displaying all teacher videos with details
const TeacherVideoFetch = ({ onTeacherSelect }) => {
    const [search, setSearch] = useState('');
    const { teachers, loading, error, fetchTeachers, thumbnailCache } = useTeachers();
    const { selectedTeacher, selectTeacher, closeVideo } = useVideoPlayer();

    const handleTeacherSelect = (teacher) => {
        selectTeacher(teacher);
        onTeacherSelect?.(teacher);
    };

    const filteredTeachers = filterTeachers(teachers, search);

    useEffect(() => {
        fetchTeachers(true); // Only fetch teachers with videos by default
    }, []);

    return (
        <>
            <div className={styles.container}>
                <TeacherHeader loading={loading} onRefresh={() => fetchTeachers(true)} />
                <TeacherSearch search={search} onSearchChange={setSearch} />
                <ErrorDisplay error={error} />

                {loading ? (
                    <LoadingDisplay />
                ) : filteredTeachers.length === 0 ? (
                    <EmptyState search={search} />
                ) : (
                    <TeacherGrid 
                        teachers={filteredTeachers} 
                        onTeacherSelect={handleTeacherSelect}
                        thumbnailCache={thumbnailCache}
                    />
                )}
            </div>

            <VideoPlayer 
                teacher={selectedTeacher} 
                onClose={closeVideo} 
            />
        </>
    );
};

export default TeacherVideoFetch;
