import { useState } from 'react';
import styles from '../../../styles/Carousel.module.css';

const AdminImageEditor = ({ image, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        alt: image.alt || '',
        description: image.description || '',
        caption: image.caption || ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/carousel?id=${image.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editData),
            });

            if (!response.ok) {
                throw new Error('Failed to update image');
            }

            onUpdate(image.id, editData);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating image:', error);
            alert('Failed to update image');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditData({
            alt: image.alt || '',
            description: image.description || '',
            caption: image.caption || ''
        });
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/carousel?id=${image.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete image');
            }

            onDelete(image.id);
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Failed to delete image');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.adminImageItem}>
            <div className={styles.adminImagePreview}>
                <img src={image.src} alt={image.alt} />
            </div>
            {isEditing ? (
                <div className={styles.adminImageForm}>
                    <input
                        type="text"
                        value={editData.alt}
                        onChange={(e) => setEditData({ ...editData, alt: e.target.value })}
                        placeholder="Alt text"
                        className={styles.adminInput}
                    />
                    <input
                        type="text"
                        value={editData.caption}
                        onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                        placeholder="Caption"
                        className={styles.adminInput}
                    />
                    <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="Description"
                        className={styles.adminTextarea}
                        rows="3"
                    />
                    <div className={styles.adminButtons}>
                        <button onClick={handleSave} className={styles.saveBtn} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={handleCancel} className={styles.cancelBtn} disabled={isLoading}>
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.adminImageInfo}>
                    <h4>{image.alt}</h4>
                    <p><strong>Caption:</strong> {image.caption}</p>
                    <p><strong>Description:</strong> {image.description}</p>
                    <div className={styles.adminButtons}>
                        <button onClick={() => setIsEditing(true)} className={styles.editBtn} disabled={isLoading}>
                            Edit
                        </button>
                        <button onClick={handleDelete} className={styles.deleteBtn} disabled={isLoading}>
                            {isLoading ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminImageEditor;
