import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { LayoutDashboard, Settings as SettingsIcon, LogOut, Image as ImageIcon, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { io } from 'socket.io-client';

const api = axios.create({ baseURL: 'https://testdesktracking.onrender.com/api' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const formatHrs = (secs) => (secs / 3600).toFixed(2);

// ---------------- STYLES (MODERN UI) ----------------
const inputStyle = { padding: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', backdropFilter: 'blur(10px)' };
const btnStyle = { padding: 12, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' };
const navBtn = (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', border: 'none', background: active ? 'linear-gradient(90deg, var(--primary-color), transparent)' : 'transparent', color: active ? 'white' : 'var(--text-color)', cursor: 'pointer', borderRadius: 8, textAlign: 'left', fontWeight: 'bold', transition: '0.3s' });
const cardStyle = { background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)', padding: 25, borderRadius: 15, boxShadow: '0 8px 32px rgba(0,0,0,0.05)', flex: 1, color: 'var(--text-color)' };
const themeCard = (p, b, t) => ({ background: b, color: t, border: `3px solid ${p}`, padding: '30px 20px', borderRadius: 10, cursor: 'pointer', flex: 1, textAlign: 'center', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' });

// ---------------- AUTH SCREEN ----------------
const AuthScreen = () => {
    const { dispatch } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const payload = isLogin ? { email, password } : { name, email, password };
            const res = await api.post(endpoint, payload);
            dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
        } catch (error) {
            alert('Error: ' + (error.response?.data?.message || 'Check backend'));
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: 40, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', color: 'var(--text-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--primary-color)', fontSize: 28, marginBottom: 30 }}>DeskTime Pro</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {!isLogin && <input style={inputStyle} type="text" placeholder="Name" onChange={e => setName(e.target.value)} required />}
                <input style={inputStyle} type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} required />
                <input style={inputStyle} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
                <button style={btnStyle} type="submit">{isLogin ? 'Login' : 'Register'}</button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, cursor: 'pointer', color: 'gray' }} onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Create an account' : 'Already have an account? Login'}
            </p>
        </div>
    );
};

// ---------------- VIEWS ----------------
const DashboardView = ({ summary }) => {
    if (!summary) return <div>Loading Live Analytics...</div>;
    const { todaySeconds, weekSeconds, productivityScore, dailyData, hourlyData, timelineData, topApps } = summary;

    const APP_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6'];

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Live Dashboard</h2>
                <button style={{...btnStyle, padding: '8px 16px'}} onClick={() => {
                    if(!hourlyData) return;
                    let csv = 'Time,Productive (min),Idle (min),Unproductive (min)\n';
                    hourlyData.forEach(h => {
                        csv += `${h.time},${h.productive},${h.idle},${h.unproductive}\n`;
                    });
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                }}>
                    Download CSV Report
                </button>
            </div>
            
            {/* Stat Cards */}
            <div className="stats-grid">
                <div style={{...cardStyle, background: 'linear-gradient(135deg, rgba(0,136,254,0.1), transparent)'}}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Today's Total Work</h4>
                    <h2 style={{ margin: '10px 0', color: '#0088FE', fontSize: 36 }}>{formatHrs(todaySeconds)} <span style={{fontSize: 16}}>hrs</span></h2>
                </div>
                <div style={{...cardStyle, background: 'linear-gradient(135deg, rgba(0,196,159,0.1), transparent)'}}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>This Week</h4>
                    <h2 style={{ margin: '10px 0', color: '#00C49F', fontSize: 36 }}>{formatHrs(weekSeconds)} <span style={{fontSize: 16}}>hrs</span></h2>
                </div>
                <div style={{...cardStyle, background: 'linear-gradient(135deg, rgba(255,128,66,0.1), transparent)'}}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Productivity Score</h4>
                    <h2 style={{ margin: '10px 0', color: '#FF8042', fontSize: 36 }}>{productivityScore}%</h2>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid" style={{ marginTop: 30, display: 'flex', gap: 20, flexWrap: 'wrap', flexDirection: 'column' }}>
                <div style={{ ...cardStyle, width: '100%', height: 350 }}>
                    <h4 style={{marginBottom: 20}}>Daily Working Hours Summary</h4>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={hourlyData} barCategoryGap="15%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="time" stroke="gray" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                            <YAxis stroke="gray" domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} tickFormatter={(v) => v + 'm'} tick={{fontSize: 12}} />
                            <RechartsTooltip 
                                contentStyle={{background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, color: '#fff'}} 
                                formatter={(value, name) => [value + ' min', name]}
                            />
                            <Legend />
                            <Bar dataKey="productive" name="Productive" stackId="a" fill="#52c41a" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="idle" name="Idle" stackId="a" fill="#cccccc" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="unproductive" name="Unproductive" stackId="a" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ ...cardStyle, flex: 2, minWidth: 300, height: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                        <h4 style={{marginBottom: 20}}>Minute-by-Minute Timeline</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {timelineData && timelineData.map((hourData, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 50, fontSize: 12, color: 'gray', fontWeight: 'bold' }}>
                                    {`${hourData.hour.toString().padStart(2, '0')}:00`}
                                </div>
                                <div style={{ flex: 1, display: 'flex', height: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {hourData.minutes.map((m, mIdx) => {
                                        let bg = 'transparent';
                                        let title = `${hourData.hour.toString().padStart(2, '0')}:${mIdx.toString().padStart(2, '0')} - No Data`;
                                        
                                        if (m !== 'empty') {
                                            if (m.status === 'productive') bg = '#00C49F'; // Green
                                            else if (m.status === 'idle') bg = 'gray'; // Gray for Ideal/Idle
                                            else if (m.status === 'unproductive') bg = '#FF8042'; // Orange/Red
                                            title = `${hourData.hour.toString().padStart(2, '0')}:${mIdx.toString().padStart(2, '0')} - ${m.status.toUpperCase()} (${m.app})`;
                                        }

                                        return (
                                            <div 
                                                key={mIdx} 
                                                style={{ flex: 1, height: '100%', background: bg, borderRight: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}
                                                title={title}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {!timelineData && (
                            <div style={{ color: 'gray', textAlign: 'center', padding: '20px 0' }}>Loading timeline...</div>
                        )}
                    </div>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: 300, height: 350 }}>
                    <h4 style={{marginBottom: 20}}>Top Apps Used Today</h4>
                    {topApps && topApps.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie data={topApps} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {topApps.map((entry, index) => <Cell key={`cell-${index}`} fill={APP_COLORS[index % APP_COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, color: '#fff'}} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'gray'}}>No apps recorded yet</div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

const ScreenshotsView = ({ screenshots }) => {
    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Activity Logs & Screenshots</h2>
            <p style={{color: 'gray'}}>Monitored natively. Real-time background tracking is ACTIVE.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 25, marginTop: 20 }}>
                {screenshots.map(ss => (
                    <div key={ss.id} style={{ ...cardStyle, padding: 15, transition: '0.3s' }} className="hover-lift">
                        <img src={ss.imageUrl} alt="Screenshot" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, background: '#ccc' }} />
                        <div style={{ marginTop: 15, fontSize: 14, lineHeight: '1.5' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ss.activeWindow}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'gray', fontSize: 12 }}>
                                <span>{new Date(ss.createdAt).toLocaleTimeString(undefined, { timeZone: 'UTC', hour12: false })}</span>
                                <span style={{ padding: '2px 8px', borderRadius: 12, background: ss.isIdle ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)', color: ss.isIdle ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
                                    {ss.isIdle ? 'Idle' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {screenshots.length === 0 && <div style={{marginTop: 50, textAlign: 'center', color: 'gray', fontSize: 18}}>No activity logged yet today. Waiting for live data...</div>}
        </div>
    );
};

const LeaveView = () => {
    const [leaves, setLeaves] = useState([]);
    const [leaveType, setLeaveType] = useState('Casual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => { fetchLeaves(); }, []);

    const fetchLeaves = () => api.get('/leave').then(res => setLeaves(res.data.data)).catch(console.error);

    const applyLeave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leave', { leaveType, startDate, endDate, reason });
            fetchLeaves();
            setReason('');
            alert('Leave Applied Successfully!');
        } catch (error) {
            alert('Failed to apply leave');
        }
    };

    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Leave Management</h2>
            <div style={{ display: 'flex', gap: 30, marginTop: 20 }}>
                {/* Apply Form */}
                <div style={{...cardStyle, flex: 1}}>
                    <h3 style={{marginBottom: 20}}>Apply for Leave</h3>
                    <form onSubmit={applyLeave} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                        <select style={inputStyle} value={leaveType} onChange={e=>setLeaveType(e.target.value)}>
                            <option value="Casual">Casual Leave</option>
                            <option value="Sick">Sick Leave</option>
                            <option value="Unpaid">Unpaid Leave</option>
                        </select>
                        <div style={{display: 'flex', gap: 10}}>
                            <input style={inputStyle} type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)} />
                            <input style={inputStyle} type="date" required value={endDate} onChange={e=>setEndDate(e.target.value)} />
                        </div>
                        <textarea style={{...inputStyle, height: 100, resize: 'none'}} placeholder="Reason..." required value={reason} onChange={e=>setReason(e.target.value)}></textarea>
                        <button style={btnStyle} type="submit">Submit Request</button>
                    </form>
                </div>

                {/* History */}
                <div style={{...cardStyle, flex: 2, overflowY: 'auto', maxHeight: 400}}>
                    <h3 style={{marginBottom: 20}}>My Leave History</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'gray'}}>
                                <th style={{padding: 10}}>Type</th>
                                <th style={{padding: 10}}>Dates</th>
                                <th style={{padding: 10}}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(l => (
                                <tr key={l.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                    <td style={{padding: 15, fontWeight: 'bold'}}>{l.leaveType}</td>
                                    <td style={{padding: 15, color: 'gray'}}>{l.startDate} to {l.endDate}</td>
                                    <td style={{padding: 15}}>
                                        <span style={{padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', 
                                            background: l.status==='Approved' ? 'rgba(0,255,0,0.1)' : l.status==='Rejected' ? 'rgba(255,0,0,0.1)' : 'rgba(255,165,0,0.1)',
                                            color: l.status==='Approved' ? '#52c41a' : l.status==='Rejected' ? '#ff4d4f' : '#faad14'
                                        }}>
                                            {l.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ---------------- MAIN LAYOUT ----------------
const SettingsView = () => {
    const { state, dispatch } = useContext(AuthContext);
    const { theme, saveTheme } = useContext(ThemeContext);
    
    const [idleTimeout, setIdleTimeout] = useState(state.user?.settings?.idleTimeout || 60);
    const [categoriesStr, setCategoriesStr] = useState(JSON.stringify(state.user?.settings?.appCategories || {}, null, 2));

    const saveSettings = async () => {
        try {
            const parsed = JSON.parse(categoriesStr);
            const res = await api.put('/user/settings', { settings: { idleTimeout, appCategories: parsed } });
            dispatch({ type: 'LOGIN_SUCCESS', payload: { ...state, user: { ...state.user, settings: res.data.data } } });
            alert("Settings saved successfully!");
        } catch (e) {
            alert("Error saving settings. Ensure JSON is valid.");
        }
    };

    const themes = {
        dark: { mode: 'dark', primaryColor: '#8b5cf6', backgroundColor: '#1a1a2e', textColor: '#ffffff' },
        light: { mode: 'light', primaryColor: '#0088FE', backgroundColor: '#f4f7f6', textColor: '#333333' },
        dracula: { mode: 'dracula', primaryColor: '#ff79c6', backgroundColor: '#282a36', textColor: '#f8f8f2' }
    };

    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Theme & Settings</h2>
            <p style={{color: 'gray', marginBottom: 30}}>Customize your DeskTime Pro experience.</p>
            
            <h4 style={{marginBottom: 20}}>Select Theme</h4>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div onClick={() => saveTheme(themes.dark)} style={themeCard(theme.mode === 'dark' ? 'var(--primary-color)' : 'transparent', '#1a1a2e', '#fff')}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🌙</div>
                    Dark Mode
                </div>
                <div onClick={() => saveTheme(themes.light)} style={themeCard(theme.mode === 'light' ? 'var(--primary-color)' : 'transparent', '#f0f2f5', '#333')}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>☀️</div>
                    Light Mode
                </div>
                <div onClick={() => saveTheme(themes.dracula)} style={themeCard(theme.mode === 'dracula' ? 'var(--primary-color)' : 'transparent', '#282a36', '#f8f8f2')}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🧛</div>
                    Dracula
                </div>
            </div>

            <div style={{ marginTop: 40 }}>
                <h4 style={{marginBottom: 20}}>Tracking Preferences</h4>
                <div style={{...cardStyle, display: 'flex', flexDirection: 'column', gap: 15}}>
                    <label>Idle Timeout (Seconds)</label>
                    <input type="number" style={inputStyle} value={idleTimeout} onChange={e => setIdleTimeout(Number(e.target.value))} />
                    
                    <label>App Categorization (JSON format)</label>
                    <textarea style={{...inputStyle, height: 150, fontFamily: 'monospace'}} value={categoriesStr} onChange={e => setCategoriesStr(e.target.value)}></textarea>
                    
                    <button style={{...btnStyle, alignSelf: 'flex-start'}} onClick={saveSettings}>Save Preferences</button>
                </div>
            </div>
        </div>
    );
};

// ---------------- ADMIN VIEW ----------------
const AdminView = () => {
    const { state } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    
    const fetchUsers = () => {
        api.get('/admin/dashboard').then(res => setUsers(res.data.data)).catch(console.error);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            alert("Role updated successfully!");
            fetchUsers();
        } catch (e) {
            alert(e.response?.data?.message || "Error updating role");
        }
    };

    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 30 }}>Admin Panel</h2>
            <div style={{...cardStyle}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'gray'}}>
                            <th style={{padding: 10}}>ID</th>
                            <th style={{padding: 10}}>Name / Email</th>
                            <th style={{padding: 10}}>Role</th>
                            <th style={{padding: 10}}>Status</th>
                            <th style={{padding: 10}}>Today's Work</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                <td style={{padding: 10}}>{u.id}</td>
                                <td style={{padding: 10}}><strong>{u.name}</strong><br/><span style={{fontSize: 12, color: 'gray'}}>{u.email}</span></td>
                                <td style={{padding: 10}}>
                                    {state.user?.email === 'mdmiraj.paperles@gmail.com' ? (
                                        <select 
                                            style={{...inputStyle, padding: '4px 8px', width: 'auto'}} 
                                            value={u.role || 'user'} 
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                        >
                                            <option value="user">User</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    ) : (
                                        <span style={{textTransform: 'capitalize'}}>{u.role || 'user'}</span>
                                    )}
                                </td>
                                <td style={{padding: 10}}>
                                    <span style={{ padding: '2px 8px', borderRadius: 12, background: u.isTrackingActive ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)', color: u.isTrackingActive ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
                                        {u.isTrackingActive ? 'Live' : 'Offline'}
                                    </span>
                                </td>
                                <td style={{padding: 10}}>{formatHrs(u.totalMinutes * 60)} hrs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MainApp = () => {
    const { state, dispatch } = useContext(AuthContext);
    const [view, setView] = useState('dashboard');
    const [summary, setSummary] = useState(null);
    const [screenshots, setScreenshots] = useState([]);
    const [socket, setSocket] = useState(null);

    const [selectedDate, setSelectedDate] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const sumRes = await api.get(`/time/summary${selectedDate ? `?date=${selectedDate}` : ''}`);
            setSummary(sumRes.data.data);
            const ssRes = await api.get('/tracking/screenshots');
            setScreenshots(ssRes.data.data);
        } catch (e) { console.error("Fetch Error:", e); }
    }, [selectedDate]);

    // INIT AUTOMATION & WEBSOCKET
    useEffect(() => {
        if (state.isAuthenticated && state.token) {
            // Start Auto Session
            api.get('/time/auto').then(res => {
                if (window.electronAPI) {
                    window.electronAPI.startTracking({ token: state.token, timeEntryId: res.data.data.id });
                }
            }).catch(console.error);

            // Initial Fetch
            fetchData();

            // Setup WebSocket for REAL-TIME AUTO RELOAD
            const newSocket = io('https://testdesktracking.onrender.com');
            setSocket(newSocket);
            
            newSocket.on('dashboard_update', (data) => {
                console.log("Live Update Received!", data);
                fetchData(); // Instantly refresh data without page reload
            });

            return () => {
                newSocket.disconnect();
                if (window.electronAPI) window.electronAPI.stopTracking();
            };
        }
    }, [state.isAuthenticated, state.token, fetchData]);

    if (!state.isAuthenticated) return <AuthScreen />;

    return (
        <div className="main-layout">
            <style>{`
                .fade-in { animation: fadeIn 0.5s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .main-layout { display: flex; height: 100vh; background: var(--bg-color); color: var(--text-color); font-family: 'Inter', sans-serif; }
                .sidebar { width: 260px; background: rgba(0,0,0,0.03); backdrop-filter: blur(10px); padding: 25px; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.05); }
                .content-area { flex: 1; padding: 50px; overflow-y: auto; }
                @media (max-width: 768px) {
                    .main-layout { flex-direction: column; }
                    .sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 15px; }
                    .content-area { padding: 20px; }
                }
            `}</style>
            
            {/* Sidebar */}
            <div className="sidebar">
                <h1 style={{ color: 'transparent', backgroundClip: 'text', backgroundImage: 'linear-gradient(90deg, var(--primary-color), #8b5cf6)', marginBottom: 30, display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 900 }}>DeskTime Pro</h1>
                
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <button style={navBtn(view==='dashboard')} onClick={()=>setView('dashboard')}><LayoutDashboard size={20}/> Dashboard</button>
                    <button style={navBtn(view==='screenshots')} onClick={()=>setView('screenshots')}><ImageIcon size={20}/> Activity & SS</button>
                    <button style={navBtn(view==='leave')} onClick={()=>setView('leave')}><Calendar size={20}/> Leave Hub</button>
                    <button style={navBtn(view==='settings')} onClick={()=>setView('settings')}><SettingsIcon size={20}/> Settings</button>
                    {state.user?.role === 'admin' && (
                        <button style={navBtn(view==='admin')} onClick={()=>setView('admin')}><SettingsIcon size={20}/> Admin Panel</button>
                    )}
                </nav>

                {summary && summary.isTrackingActive ? (
                    <div style={{marginTop: 'auto', marginBottom: 20, padding: 15, background: 'rgba(0, 255, 0, 0.1)', borderRadius: 10, fontSize: 13, color: '#52c41a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10}}>
                        <span style={{width: 8, height: 8, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 10px #52c41a', animation: 'pulse 1.5s infinite'}}></span> 
                        Live Tracking Active
                    </div>
                ) : (
                    <div style={{marginTop: 'auto', marginBottom: 20, padding: 15, background: 'rgba(255, 0, 0, 0.1)', borderRadius: 10, fontSize: 13, color: '#ff4d4f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10}}>
                        <span style={{width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f'}}></span> 
                        Tracking Paused
                    </div>
                )}

                <button style={{...navBtn(false), color: '#ff4d4f'}} onClick={() => {
                    dispatch({type: 'LOGOUT'});
                    if(window.electronAPI) window.electronAPI.stopTracking();
                }}><LogOut size={20}/> Logout</button>
            </div>

            {/* Main Area */}
            <div className="content-area">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'gray', fontSize: 16 }}>{new Date(selectedDate || Date.now()).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                        <h1 style={{ margin: '5px 0 0 0', fontSize: 28, fontWeight: 800 }}>Welcome back, <span style={{color: 'var(--primary-color)'}}>{state.user?.name || 'Pro User'}</span>!</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        {view === 'dashboard' && (
                            <input 
                                type="date" 
                                style={{ ...inputStyle, width: 'auto', padding: '8px 12px' }}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        )}
                        <div style={{width: 45, height: 45, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18}}>
                            {state.user?.name ? state.user.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                    </div>
                </div>

                {view === 'dashboard' && <DashboardView summary={summary} />}
                {view === 'screenshots' && <ScreenshotsView screenshots={screenshots} />}
                {view === 'leave' && <LeaveView />}
                {view === 'settings' && <SettingsView />}
                {view === 'admin' && <AdminView />}
            </div>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MainApp />
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
