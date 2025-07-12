import FileUpload from '../FileUpload';
import AdminImageEditor from './AdminImageEditor';
import styles from '../../../styles/Carousel.module.css';

const AdminPanel = ({ 
    images, 
    onImageUpload, 
    onUpdateImage, 
    onDeleteImage, 
    onDragStart, 
    onDragOver, 
    onDrop 
}) => {
    return (
        <div className={styles.adminPanel}>
            <h3>Carousel Management</h3>
            <div className={styles.adminUpload}>
                <h4>Add New Image</h4>
                <FileUpload
                    parentId="carousel-images"
                    parentType="carousel"
                    onUploadComplete={onImageUpload}
                />
            </div>
            <div className={styles.adminImages}>
                <h4>Manage Images (Drag to reorder)</h4>
                <div className={styles.adminImagesList}>
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className={styles.adminImageWrapper}
                            draggable
                            onDragStart={(e) => onDragStart(e, index)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, index)}
                        >
                            <div className={styles.dragHandle}>⋮⋮</div>
                            <AdminImageEditor
                                image={image}
                                onUpdate={onUpdateImage}
                                onDelete={onDeleteImage}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
