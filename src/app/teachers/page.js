'use client';

import TeacherVideoFetch from "../components/teacherFetch";
import TeacherVideoUpload from "../components/teacherUpload";
import { useSession } from 'next-auth/react';
import "../global.css"

const isTeacher = () => {
    const { data: session, _ } = useSession();
    return session?.user?.level == 1;
};

export default function Teachers() {
    return (
        <div>
            {
                isTeacher() ?
                    <TeacherVideoUpload />
                    : null
            }
            <TeacherVideoFetch />
        </div>
    );
}
