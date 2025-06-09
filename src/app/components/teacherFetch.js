"use client";

import { useState, useEffect } from 'react';
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

const useVideos = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [thumbnailCache, setThumbnailCache] = useState(new Map());
    const { generateThumbnail } = useThumbnailGenerator();

    const fetchVideos = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/teacherFetchVideos');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch videos`);
            }

            const data = await response.json();
            if (data) {
                console.log(data.teachers);
                setVideos(data.teachers);
                
                data.teachers.forEach(async (video) => {
                    if (!video.thumbnail && !thumbnailCache.has(video.user_id)) {
                        try {
                            const thumbnail = await generateThumbnail(video.video_path);
                            setThumbnailCache(prev => new Map(prev.set(video.user_id, thumbnail)));
                        } catch (err) {
                            console.warn(`Failed to generate thumbnail for video ${video.user_id}:`, err);
                        }
                    }
                });
            }
            
        } catch (err) {
            setError(err.message);
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchVideoById = async (teacherId) => {
        setLoading(true);
        setError('');

        try {
            // Use query parameter instead of path parameter
            const response = await fetch(`/api/teacherFetchVideos?teacher_id=${teacherId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch video`);
            }

            const data = await response.json();
            if (data && data.teachers && data.teachers.length > 0) {
                const video = data.teachers[0]; // Get the first (and should be only) teacher
                
                if (!video.thumbnail && !thumbnailCache.has(video.user_id)) {
                    try {
                        const thumbnail = await generateThumbnail(video.video_path);
                        setThumbnailCache(prev => new Map(prev.set(video.user_id, thumbnail)));
                    } catch (err) {
                        console.warn(`Failed to generate thumbnail for video ${video.user_id}:`, err);
                    }
                }
                
                return video;
            } else {
                throw new Error('Teacher not found or has no video');
            }
            
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { 
        videos, 
        loading, 
        error, 
        fetchVideos, 
        fetchVideoById,
        thumbnailCache 
    };
};

const useVideoPlayer = () => {
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const selectVideo = (video) => {
        setSelectedVideo(video);
        setIsPlaying(true);
    };

    const closeVideo = () => {
        setSelectedVideo(null);
        setIsPlaying(false);
    };

    return { selectedVideo, isPlaying, selectVideo, closeVideo };
};

// ===================== UTILS =====================

const filterVideos = (videos, searchTerm) => {
    if (!searchTerm) return videos;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return videos.filter(video => 
        video.user_name?.toLowerCase().includes(lowercaseSearch)
    );
};

// ===================== COMPONENTS =====================

const VideoPlayer = ({ video, onClose }) => {
    if (!video) return null;

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
                    src={video.video_path}
                    controls
                    autoPlay
                    className={styles.videoPlayer}
                >
                    Your browser does not support the video tag.
                </video>
                <div className={styles.videoInfo}>
                    <h4>{video.user_name || 'Unknown Teacher'}</h4>
                </div>
            </div>
        </div>
    );
};

const VideoThumbnail = ({ video, thumbnailCache }) => {
    const [imgError, setImgError] = useState(false);
    const [thumbnailLoading, setThumbnailLoading] = useState(false);
    
    const getThumbnailSrc = () => {
        if (video.thumbnail && !imgError) {
            return video.thumbnail;
        }
        if (thumbnailCache.has(video.user_id)) {
            return thumbnailCache.get(video.user_id);
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
                alt={video.user_id || 'Video thumbnail'}
                className={styles.thumbnailImg}
                onError={handleImageError}
                onLoad={() => setThumbnailLoading(false)}
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

const VideoCard = ({ video, onSelect, thumbnailCache }) => {
    const handleCardClick = () => {
        onSelect?.(video);
    };

    return (
        <div className={styles.card}>
            <div className={styles.thumb} onClick={handleCardClick}>
                <VideoThumbnail video={video} thumbnailCache={thumbnailCache} />
                <div className={styles.overlay}>▶</div>
            </div>
            <div className={styles.cardInfo}>
                <div className={styles.teacherName}>
                    {video.user_name || 'Unknown Teacher'}
                </div>
            </div>
        </div>
    );
};

const VideoSearch = ({ search, onSearchChange }) => {
    return (
        <div className={styles.search}>
            <input
                type="text"
                placeholder="Search videos by title"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    );
};

const VideoHeader = ({ loading, onRefresh, title = "Teacher Introduction Videos" }) => {
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
            Loading videos...
        </div>
    );
};

const EmptyState = ({ search }) => {
    return (
        <div className={styles.empty}>
            📹 {search ? 'No matching videos' : 'No videos yet'}
        </div>
    );
};

const VideoGrid = ({ videos, onVideoSelect, thumbnailCache }) => {
    return (
        <div className={styles.grid}>
            {videos.map(video => (
                <VideoCard
                    key={video.user_id}
                    video={video}
                    onSelect={onVideoSelect}
                    thumbnailCache={thumbnailCache}
                />
            ))}
        </div>
    );
};

// ===================== MAIN COMPONENTS =====================

// Component that directly shows a video player for a specific teacher (inline display)
export const TeacherVideoPlayer = ({ teacherId, autoPlay = true, className = '' }) => {
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { generateThumbnail } = useThumbnailGenerator();

    const fetchVideo = async () => {
        setLoading(true);
        setError('');

        try {
            // Use query parameter instead of path parameter
            const response = await fetch(`/api/teacherFetchVideos?teacher_id=${teacherId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch video`);
            }

            const data = await response.json();
            if (data && data.teachers && data.teachers.length > 0) {
                setVideo(data.teachers[0]); // Get the first (and should be only) teacher
            } else {
                throw new Error('Teacher not found or has no video');
            }
            
        } catch (err) {
            setError(err.message);
            setVideo(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teacherId) {
            fetchVideo();
        }
    }, [teacherId]);

    if (loading) {
        return <LoadingDisplay />;
    }

    if (error) {
        return <ErrorDisplay error={error} />;
    }

    if (!video) {
        return <EmptyState search={false} />;
    }

    return (
        <div className={`${styles.inlineVideoContainer} ${className}`}>
            <video
                src={video.video_path}
                controls
                autoPlay={autoPlay}
                className={styles.inlineVideoPlayer}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

// Main component for displaying all teacher videos
const TeacherVideoFetch = ({ onVideoSelect }) => {
    const [search, setSearch] = useState('');
    const { videos, loading, error, fetchVideos, thumbnailCache } = useVideos();
    const { selectedVideo, selectVideo, closeVideo } = useVideoPlayer();

    const handleVideoSelect = (video) => {
        selectVideo(video);
        onVideoSelect?.(video);
    };

    const filteredVideos = filterVideos(videos, search);

    useEffect(() => {
        fetchVideos();
    }, []);

    return (
        <>
            <div className={styles.container}>
                <VideoHeader loading={loading} onRefresh={fetchVideos} />
                <VideoSearch search={search} onSearchChange={setSearch} />
                <ErrorDisplay error={error} />

                {loading ? (
                    <LoadingDisplay />
                ) : filteredVideos.length === 0 ? (
                    <EmptyState search={search} />
                ) : (
                    <VideoGrid 
                        videos={filteredVideos} 
                        onVideoSelect={handleVideoSelect}
                        thumbnailCache={thumbnailCache}
                    />
                )}
            </div>

            <VideoPlayer 
                video={selectedVideo} 
                onClose={closeVideo} 
            />
        </>
    );
};

export default TeacherVideoFetch;
