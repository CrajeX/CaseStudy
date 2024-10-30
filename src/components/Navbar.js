// // src/components/Navbar.js
// import React from 'react';
// import { Link } from 'react-router-dom';
// import { auth } from '../firebase';

// const Navbar = () => {
//     const handleLogout = async () => {
//         await auth.signOut();
//     };

//     return (
//         <nav>
//             <Link to="/">Home</Link>
//             <Link to="/job-board">Job Board</Link>
//             <Link to="/profile">Applicant Profile</Link>
//             <Link to="/employer-profile">Employer Profile</Link>
//             <button onClick={handleLogout}>Logout</button>
//         </nav>
//     );
// };

// export default Navbar;
// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import styles from 'C:\\Users\\USER\\job-board-app\\src\\styles.css';
import styles from './styles.css';
const Navbar = ({ userType, onLogout }) => {
    return (
        <nav id="navbar">
            <ul>
                
                {userType === 'applicant' && (
                    <>
                        {/* <li><Link to="/home">Feed</Link></li> */}
                        <li><Link to="/applicant/profile">Profile</Link></li>
                        <li><Link to="/applicant/search-jobs">Search Jobs</Link></li>
                        {userType === 'applicant' && <Link to="/portfolio">Portfolio</Link>}
                    </>
                )}
                {userType === 'employer' && (
                    <>
                        <li><Link to="/employer/profile">Profile</Link></li>
                        <li><Link to="/employer/post-job">Post Job</Link></li>
                    </>
                )}
                <li><Link to="/" onClick={onLogout}>Logout</Link></li>
            </ul>
        </nav>
    );
};

export default Navbar;
