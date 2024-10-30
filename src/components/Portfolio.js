import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import axios from 'axios'; // Ensure axios is imported

const Portfolio = () => {
    const [liveDemoLink, setLiveDemoLink] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [expandedSubmission, setExpandedSubmission] = useState(null);

    // Fetch existing submissions from Firestore
    const fetchSubmissions = async () => {
        const submissionsRef = collection(doc(db, 'applicants', auth.currentUser.uid), 'submissions');
        const snapshot = await getDocs(submissionsRef);
        const submissionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter out submissions without a live demo link
        const validSubmissions = submissionsData.filter(submission => submission.liveDemoLink);
        
        setSubmissions(validSubmissions);
    };

    useEffect(() => {
        fetchSubmissions(); // Fetch submissions when the component mounts
    }, []);

    const handleSubmission = async () => {
        // Check if the liveDemoLink is not empty
        if (!liveDemoLink.trim()) {
            alert("Please enter a valid live demo link."); // Inform the user
            return; // Exit if the link is invalid
        }
    
        const newPayload = {
            url: liveDemoLink,  // Ensure this matches your backend's expected structure
        };
    
        const submissionsRef = collection(doc(db, 'applicants', auth.currentUser.uid), 'submissions');
    
        try {
            // Sending request to the backend to analyze the demo link
            const response = await axios.post('https://casestudynapoles.netlify.app/analyze', newPayload);
            console.log("Response from backend:", response.data); // Check the response from the server
            
            // Construct new submission with scores from the response
            const newSubmission = {
                liveDemoLink,
                videoFile: videoFile ? videoFile.name : null,
                timestamp: new Date(),
                scores: {
                    html: response.data.htmlScore,
                    css: response.data.cssScore,
                    javascript: response.data.jsScore,
                },
            };
    
            // Add the submission to Firestore
            await addDoc(submissionsRef, newSubmission);
            fetchSubmissions(); // Fetch updated submissions after adding
    
            // Clear the form fields
            setLiveDemoLink('');
            setVideoFile(null);
        } catch (error) {
            console.error("Error submitting the demo link:", error); // Log any error from the request
            alert("There was an error processing your request. Please check your link and try again."); // Inform the user of the error
        }
    };
    

    const toggleExpandSubmission = (submissionId) => {
        setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
    };

    const handleDeleteSubmission = async (submissionId) => {
        const submissionRef = doc(db, 'applicants', auth.currentUser.uid, 'submissions', submissionId);
        await deleteDoc(submissionRef);
        fetchSubmissions();
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
            <button onClick={handleSubmission}>Add Submission</button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                {submissions.map(submission => (
                    <div
                        key={submission.id}
                        style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '10px',
                            width: '200px',
                            cursor: 'pointer',
                            background: expandedSubmission === submission.id ? '#f9f9f9' : '#fff',
                            transition: 'background 0.3s',
                        }}
                        onClick={() => toggleExpandSubmission(submission.id)}
                    >
                        <h4>Submission</h4>
                        <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all', margin: '0' }}>
                            Live Demo Link: <a href={submission.liveDemoLink} target="_blank" rel="noopener noreferrer">{submission.liveDemoLink}</a>
                        </p>
                        {expandedSubmission === submission.id && (
                            <div>
                                <h5>Scores:</h5>
                                {submission.scores && (
                                    <>
                                        <p>HTML Score: {submission.scores.html}</p>
                                        <p>CSS Score: {submission.scores.css}</p>
                                        <p>JavaScript Score: {submission.scores.javascript}</p>
                                    </>
                                )}
                                <button onClick={() => handleDeleteSubmission(submission.id)}>Delete Submission</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Portfolio;
