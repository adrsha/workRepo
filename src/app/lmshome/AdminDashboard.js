import AdminControl from '../components/AdminControl.js';
import styles from '../../styles/Adminlms.module.css';

const AdminDashboard = ({ userData}) => {
    const { pendingTeachersData } = userData;

    return (
        <div className={styles.content}>
            <AdminControl pendingTeachersData={pendingTeachersData} />
        </div>
    );
};

export default AdminDashboard;
