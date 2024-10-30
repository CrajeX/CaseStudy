import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GithubAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const Auth = ({ userType, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [githubLink, setGithubLink] = useState('');
    const [isSignUp, setIsSignUp] = useState(true); // Toggle between Sign Up and Sign In

    const provider = new GithubAuthProvider();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let userCredential;
            if (isSignUp) {
                // Email Sign-Up Process
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);

                // Save applicant's personal info to Firestore if user is an applicant
                if (userType === 'applicant') {
                    await setDoc(doc(db, 'applicants', userCredential.user.uid), {
                        name,
                        email,
                        githubLink,
                    });
                }
                if (userType === 'employer') {
                    await setDoc(doc(db, 'employer', userCredential.user.uid), {
                        email,
                    });
                }
            } else {
                // Email Sign-In Process
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
            }
        } catch (error) {
            console.error("Error signing in/up:", error);
        }
    };

    const handleGithubSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const credential = GithubAuthProvider.credentialFromResult(result);
            const githubProfile = result.additionalUserInfo.profile;
            const githubLink = githubProfile.html_url;
            setUser(result.user);

            // Save or update GitHub link in Firestore
            if (userType === 'applicant') {
                await setDoc(doc(db, 'applicants', result.user.uid), {
                    name: result.user.displayName || '',
                    email: result.user.email || '',
                    githubLink: githubLink,
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error with GitHub sign-in:", error);
        }
    };

    return (
        <div>
            <h2>{isSignUp ? "Sign Up" : "Sign In"} as {userType}</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {isSignUp && userType === 'applicant' && (
                    <>
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="GitHub Profile Link"
                            value={githubLink}
                            onChange={(e) => setGithubLink(e.target.value)}
                        />
                    </>
                )}
                <button type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>
            </form>
            <button onClick={handleGithubSignIn}>
                Sign In with GitHub
            </button>
            <button onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
        </div>
    );
};

export default Auth;
