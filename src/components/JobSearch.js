// src/components/JobSearch.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const JobSearch = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [expandedJobId, setExpandedJobId] = useState(null); // Track a single expanded job

    useEffect(() => {
        const fetchJobs = async () => {
            const jobsCollection = collection(db, 'jobs');
            const jobSnapshot = await getDocs(jobsCollection);
            const jobList = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setJobs(jobList);
            setFilteredJobs(jobList);
        };

        fetchJobs();
    }, []);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        const filtered = jobs.filter(job =>
            job.title.toLowerCase().includes(e.target.value.toLowerCase()) ||
            job.description.toLowerCase().includes(e.target.value.toLowerCase())
        );
        setFilteredJobs(filtered);
    };

    const toggleJobDescription = (jobId) => {
        // Expand the clicked job and collapse any previously expanded job
        setExpandedJobId(expandedJobId === jobId ? null : jobId);
    };

    const handleApply = (jobId, e) => {
        e.stopPropagation(); // Prevent triggering the toggle when clicking the Apply button
        console.log(`Applied to job with ID: ${jobId}`);
        // Add any additional apply logic here (e.g., updating Firestore)
    };

    return (
        <div id="job-search-container" style={{ padding: '20px' }}>
            <h2>Search Jobs</h2>
            <input
                type="text"
                placeholder="Search for jobs..."
                value={searchTerm}
                onChange={handleSearch}
                style={{ marginBottom: '20px', width: '100%' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {filteredJobs.map(job => (
                    <div
                        key={job.id}
                        style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '10px',
                            width: '200px',
                            cursor: 'pointer',
                            background: expandedJobId === job.id ? '#f9f9f9' : '#fff',
                        }}
                        onClick={() => toggleJobDescription(job.id)} // Toggle job details on click
                    >
                        <h3>{job.title}</h3>
                        <p><strong>Company:</strong> {job.company}</p>
                        {expandedJobId === job.id && ( // Show details only for the expanded job
                            <>
                                <p>{job.description}</p>
                                <button
                                    onClick={(e) => handleApply(job.id, e)} // Prevent card toggle on Apply click
                                    style={{
                                        backgroundColor: '#007bff',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '8px 12px',
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Apply
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default JobSearch;
