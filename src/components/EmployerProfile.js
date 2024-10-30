// src/components/EmployerProfile.js
import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const EmployerProfile = () => {
    const [profilePicURL, setProfilePicURL] = useState('');
    const [coverPhotoURL, setCoverPhotoURL] = useState('');
    const [name, setName] = useState('');
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostDescription, setNewPostDescription] = useState('');
    const [newPostImage, setNewPostImage] = useState(null);
    const [posts, setPosts] = useState([]);
    const [showAddPostForm, setShowAddPostForm] = useState(false);

    // Load employer data and posts on component mount
    useEffect(() => {
        const loadUserData = async () => {
            const userDoc = await getDoc(doc(db, 'employers', auth.currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setProfilePicURL(data.profilePicURL || '');
                setCoverPhotoURL(data.coverPhotoURL || '');
                setName(data.name || '');
            }
        };

        const fetchUserPosts = async () => {
            const q = query(collection(db, 'posts'), where('authorId', '==', auth.currentUser.uid));
            const postSnapshot = await getDocs(q);
            setPosts(postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        loadUserData();
        fetchUserPosts();
    }, []);

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const storageRef = ref(storage, `users/${auth.currentUser.uid}/${type}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // Update state and Firestore with the new URL
            if (type === 'profilePic') {
                setProfilePicURL(url);
                await updateDoc(doc(db, 'employers', auth.currentUser.uid), { profilePicURL: url });
            } else {
                setCoverPhotoURL(url);
                await updateDoc(doc(db, 'employers', auth.currentUser.uid), { coverPhotoURL: url });
            }
        }
    };

    const handleAddPost = async () => {
        const postData = {
            authorId: auth.currentUser.uid,
            authorName: name,
            authorPhoto: profilePicURL,
            title: newPostTitle,
            description: newPostDescription,
            timestamp: new Date(),
        };

        if (newPostImage) {
            const imageRef = ref(storage, `posts/${auth.currentUser.uid}/${newPostImage.name}`);
            await uploadBytes(imageRef, newPostImage);
            postData.imageUrl = await getDownloadURL(imageRef);
        }

        // Add to user's posts collection
        await addDoc(collection(db, 'posts'), postData);

        // Add to public posts collection
        await addDoc(collection(db, 'public_posts'), postData);

        setPosts([...posts, postData]);
        setNewPostTitle('');
        setNewPostDescription('');
        setNewPostImage(null);
        setShowAddPostForm(false); // Hide the form after posting
    };

    return (
        <div>
            <h2>Employer Profile</h2>
            
            {/* Cover photo */}
            <div id="cover" style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden' }}>
                <img
                    src={coverPhotoURL || 'defaultCoverPhoto.jpg'}
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

            {/* Profile picture */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '-50px', position: 'relative' }}>
                <img
                    src={profilePicURL || 'defaultProfilePic.jpg'}
                    alt="Profile"
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: '3px solid white'
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

            {/* Toggle Add Post Form */}
            <div style={{ marginTop: '20px' }}>
                <button onClick={() => setShowAddPostForm(!showAddPostForm)}>
                    {showAddPostForm ? 'Cancel' : 'Add Post'}
                </button>
                {showAddPostForm && (
                    <div style={{ marginTop: '10px' }}>
                        <input
                            type="text"
                            placeholder="Title"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                        />
                        <textarea
                            placeholder="Description"
                            value={newPostDescription}
                            onChange={(e) => setNewPostDescription(e.target.value)}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewPostImage(e.target.files[0])}
                        />
                        <button onClick={handleAddPost}>Post</button>
                    </div>
                )}
            </div>

            {/* Display posts
            <div style={{ marginTop: '20px' }} id='applicantpost'>
                <h3>Your Posts</h3>
                {posts.length === 0 ? (
                    <p>No posts yet</p>
                ) : (
                    posts.map(post => (
                        <div key={post.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}id='postal'>
                            {post.imageUrl && <img src={post.imageUrl} alt="Post" style={{ maxWidth: '100%' }} />}
                            <h4>{post.title}</h4>
                            <p>{post.description}</p>
                            <p>Posted by: {post.authorName}</p>
                            {post.authorPhoto && <img src={post.authorPhoto} alt="Author" style={{ width: '30px', borderRadius: '50%' }} />}
                            <p>{new Date(post.timestamp.seconds * 1000).toLocaleString()}</p>
                        </div>
                    ))
                )}
            </div> */}
        </div>
    );
};

export default EmployerProfile;
