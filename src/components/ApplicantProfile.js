import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const ApplicantProfile = () => {
    const [profilePicURL, setProfilePicURL] = useState('');
    const [coverPhotoURL, setCoverPhotoURL] = useState('');
    const [name, setName] = useState('');
    const [certifications, setCertifications] = useState({
        HTML: [],
        CSS: [],
        JavaScript: [],
    });
    const [selectedSkill, setSelectedSkill] = useState('HTML');

    useEffect(() => {
        const loadUserData = async () => {
            if (!auth.currentUser) {
                console.error("User is not signed in.");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'applicants', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfilePicURL(data.profilePicURL || 'defaultProfilePic.jpg');
                    setCoverPhotoURL(data.coverPhotoURL || 'defaultCoverPhoto.jpg');
                    setName(data.name || '');

                    setCertifications({
                        HTML: Array.isArray(data.certifications?.HTML) ? data.certifications.HTML : [],
                        CSS: Array.isArray(data.certifications?.CSS) ? data.certifications.CSS : [],
                        JavaScript: Array.isArray(data.certifications?.JavaScript) ? data.certifications.JavaScript : [],
                    });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        loadUserData();
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const storageRef = ref(storage, `users/${auth.currentUser.uid}/${selectedSkill}/${file.name}`);
        try {
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            const updatedCertifications = [...(certifications[selectedSkill] || []), url];
            setCertifications((prev) => ({
                ...prev,
                [selectedSkill]: updatedCertifications,
            }));

            await updateDoc(doc(db, 'applicants', auth.currentUser.uid), {
                certifications: {
                    ...certifications,
                    [selectedSkill]: updatedCertifications,
                },
            });
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    return (
        <div>
            <h2>Applicant Profile</h2>

            {/* Cover Photo */}
            <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden', marginBottom: '10px' }}>
                <img
                    src={coverPhotoURL}
                    alt="Cover"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => document.getElementById('coverPhotoInput').click()}
                />
                <input
                    id="coverPhotoInput"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'coverPhoto')}
                />
            </div>

            {/* Profile Picture, Name, and Skill Badges */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '-50px', position: 'relative' }}>
                <img
                    src={profilePicURL}
                    alt="Profile"
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: '3px solid white',
                    }}
                    onClick={() => document.getElementById('profilePicInput').click()}
                />
                <input
                    id="profilePicInput"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'profilePic')}
                />
                <div style={{ marginLeft: '20px' }}>
                    <h3>{name}</h3>
                </div>
            </div>

            {/* Badges */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                {Object.keys(certifications).map((skill) =>
                    certifications[skill]?.length > 0 ? (
                        <span key={skill} style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            fontSize: '12px'
                        }}>
                            {skill} Certified
                        </span>
                    ) : null
                )}
            </div>

            {/* Add Certificate Section */}
            <div style={{ marginTop: '20px' }}>
                <h4>Add a New Certificate</h4>
                <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    style={{ padding: '5px', marginRight: '10px' }}
                >
                    {Object.keys(certifications).map((skill) => (
                        <option key={skill} value={skill}>
                            {skill}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => document.getElementById('fileInput').click()}
                    style={{
                        padding: '5px 10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Upload Certificate
                </button>
                <input
                    id="fileInput"
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            {/* Certifications Display by Category */}
            <div style={{ marginTop: '30px' }}>
                <h4>Certifications</h4>
                {Object.entries(certifications).map(([skill, urls]) => (
                    <div key={skill} style={{ marginBottom: '20px' }}>
                        <h5 style={{
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            color: '#007bff',
                            marginBottom: '10px'
                        }}>
                            {skill} Certificates
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                            {urls.length > 0 ? (
                                urls.map((url, index) => (
                                    <div key={`${skill}-${index}`} style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                                    }}>
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            View Certificate {index + 1}
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#888' }}>No certificates for {skill}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ApplicantProfile;
