'use client';

import TeacherVideoFetch from "../components/teacherFetch";
import TeacherVideoUpload from "../components/teacherUpload";
import { useSession } from 'next-auth/react';
import { SEO } from "../seoConfig";
import "../global.css"

const isTeacher = () => {
    const { data: session, _ } = useSession();
    return session?.user?.level == 1;
};

export default function Teachers() {
    return (
        <div>
            <SEO pageKey="teachers" />
            {
                isTeacher() ?
                    <TeacherVideoUpload />
                    : null
            }
            <TeacherVideoFetch />
        </div>
    );
}
