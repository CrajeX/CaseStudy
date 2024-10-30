// src/components/Home.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Home = ({ setUserType }) => {
    const [roleSelected, setRoleSelected] = useState(false);

    const handleSelectRole = (role) => {
        setUserType(role);
        setRoleSelected(true); // Set role as selected
    };

    const handleChangeRole = () => {
        setUserType(null); // Reset user type
        setRoleSelected(false); // Reset role selection
    };

    return (
        <div className='Home'>
            <h1>Job All</h1>
            <h2>A frontend job shop</h2>
            {!roleSelected ? (
                <div className='Roles'>
                    <button onClick={() => handleSelectRole('applicant')}>
                        I am an Applicant
                    </button>
                    <button onClick={() => handleSelectRole('employer')}>
                        I am an Employer
                    </button>
                </div>
            ) : (
                <div className='Signinboard'>
                    <Link to="/signin">
                        <button>Sign In</button>
                    </Link>
                    <Link to="/signup">
                        <button>Sign Up</button>
                    </Link>
                    <button onClick={handleChangeRole}>Change Role</button>
                </div>
            )}
        </div>
    );
};

export default Home;
