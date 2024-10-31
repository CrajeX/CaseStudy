import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import axios from 'axios';

const Portfolio = () => {
    const [liveDemoLink, setLiveDemoLink] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [expandedSubmission, setExpandedSubmission] = useState(null);
    const [loading, setLoading] = useState(false); // Loading state for submissions
    const [submissionLoading, setSubmissionLoading] = useState(false); // Loading state for submission

    // Fetch existing submissions from Firestore
    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const submissionsRef = collection(doc(db, 'applicants', auth.currentUser.uid), 'submissions');
            const snapshot = await getDocs(submissionsRef);
            const submissionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const validSubmissions = submissionsData.filter(submission => submission.liveDemoLink);
            setSubmissions(validSubmissions);
        } catch (error) {
            console.error("Error fetching submissions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions(); // Fetch submissions when the component mounts
    }, []);

    const handleSubmission = async () => {
        if (!liveDemoLink.trim()) {
            alert("Please enter a valid live demo link.");
            return;
        }

        const newPayload = { url: liveDemoLink };
        const submissionsRef = collection(doc(db, 'applicants', auth.currentUser.uid), 'submissions');

        setSubmissionLoading(true); // Start loading

        try {
            const response = await axios.post('https://casestudy-19cm.onrender.com/analyze', newPayload);

            // Validate response structure
            if (response?.data?.scores) {
                const newSubmission = {
                    liveDemoLink,
                    videoFile: videoFile ? videoFile.name : null,
                    timestamp: new Date(),
                    scores: {
                        html: response.data.scores.html,
                        css: response.data.scores.css,
                        javascript: response.data.scores.javascript,
                    },
                };

                // Add the submission to Firestore
                await addDoc(submissionsRef, newSubmission);
                fetchSubmissions(); // Fetch updated submissions after adding

                // Clear the form fields
                setLiveDemoLink('');
                setVideoFile(null);
            } else {
                console.error("Unexpected response format:", response.data);
                alert("Received unexpected data from the backend.");
            }
        } catch (error) {
            console.error("Error submitting the demo link:", error);
            alert("There was an error processing your request. Please check your link and try again.");
        } finally {
            setSubmissionLoading(false); // Stop loading
        }
    };

    const toggleExpandSubmission = (submissionId) => {
        setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
    };

    const handleDeleteSubmission = async (submissionId) => {
        if (window.confirm("Are you sure you want to delete this submission?")) {
            try {
                const submissionRef = doc(db, 'applicants', auth.currentUser.uid, 'submissions', submissionId);
                await deleteDoc(submissionRef);
                fetchSubmissions();
            } catch (error) {
                console.error("Error deleting submission:", error);
            }
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>Portfolio</h3>
            <input
                type="text"
                placeholder="Enter Live Demo Link"
                value={liveDemoLink}
                onChange={(e) => setLiveDemoLink(e.target.value)}
            />
            <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
            />
            <button onClick={handleSubmission} disabled={submissionLoading}>
                {submissionLoading ? "Submitting..." : "Add Submission"}
            </button>

            {loading ? (
                <p>Loading submissions...</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {submissions.length === 0 ? (
                        <p>No submissions found.</p>
                    ) : (
                        submissions.map((submission) => (
                            <div key={submission.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
                                <h4>{submission.liveDemoLink}</h4>
                                {expandedSubmission === submission.id ? (
                                    <div>
                                        <p>Scores:</p>
                                        <p>HTML: {submission.scores.html}</p>
                                        <p>CSS: {submission.scores.css}</p>
                                        <p>JavaScript: {submission.scores.javascript}</p>
                                        <button onClick={() => toggleExpandSubmission(submission.id)}>Show Less</button>
                                    </div>
                                ) : (
                                    <button onClick={() => toggleExpandSubmission(submission.id)}>View Scores</button>
                                )}
                                <button onClick={() => handleDeleteSubmission(submission.id)}>Delete</button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Portfolio;
