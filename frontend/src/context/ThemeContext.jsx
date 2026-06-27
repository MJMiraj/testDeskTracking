import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import axios from 'axios';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { state, dispatch } = useContext(AuthContext);
    
    const [theme, setTheme] = useState({
        mode: 'light',
        primaryColor: '#007bff',
        backgroundColor: '#f4f7f6',
        textColor: '#333333'
    });

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--bg-color', theme.backgroundColor);
        root.style.setProperty('--text-color', theme.textColor);
        document.body.style.backgroundColor = theme.backgroundColor;
        document.body.style.color = theme.textColor;
        document.body.style.margin = 0;
        document.body.style.fontFamily = 'Inter, sans-serif';
    }, [theme]);

    useEffect(() => {
        if (state.isAuthenticated && state.token) {
            axios.get('http://localhost:5000/api/user/me', { headers: { Authorization: `Bearer ${state.token}` }})
                .then(res => {
                    if(res.data.data.theme) setTheme(res.data.data.theme);
                    dispatch({ type: 'UPDATE_USER', payload: res.data.data });
                })
                .catch(console.error);
        }
    }, [state.isAuthenticated, state.token, dispatch]);

    const saveTheme = async (newTheme) => {
        setTheme(newTheme);
        if (state.token) {
            await axios.put('http://localhost:5000/api/user/theme', { theme: newTheme }, { headers: { Authorization: `Bearer ${state.token}` }});
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, saveTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
