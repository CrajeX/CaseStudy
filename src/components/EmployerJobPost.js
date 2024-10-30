// src/components/EmployerJobPost.js
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const EmployerJobPost = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [company, setCompany] = useState('');
    const [location, setLocation] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const jobId = `#job_${Date.now()}`; // Unique job ID
            await addDoc(collection(db, 'jobs'), {
                id: jobId, // Add ID field to the job document
                title,
                description,
                company,
                location,
                createdAt: new Date(),
            });
            // Clear fields after submission
            setTitle('');
            setDescription('');
            setCompany('');
            setLocation('');
            alert("Job posted successfully!");
        } catch (error) {
            console.error("Error posting job:", error);
        }
    };

    return (
        <div id="job-posting-container"> {/* Added ID for styling */}
            <h2>Post a Job</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Job Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Job Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Company Name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />
                <button type="submit">Post Job</button>
            </form>
        </div>
    );
};

export default EmployerJobPost;
