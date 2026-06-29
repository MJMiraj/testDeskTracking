import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { LayoutDashboard, Settings as SettingsIcon, LogOut, Image as ImageIcon, Calendar, ListTodo, Timer, DollarSign, Brain, Target, Sparkles, AlertTriangle, Activity, CalendarDays, Waves, Award, Heart, Shield, TrendingUp, Flame, Coffee, UserPlus, Briefcase, FileText, Users, Link, Music, Database } from 'lucide-react';
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
const DashboardView = ({ summary, fetchSummary }) => {
    const { state } = useContext(AuthContext);
    const [manualTimeModal, setManualTimeModal] = useState(null);
    const [manualReason, setManualReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleManualSubmit = async () => {
        if (!manualReason) return;
        setIsSubmitting(true);
        try {
            await api.post('/time/manual', {
                date: manualTimeModal.date,
                hour: manualTimeModal.hour,
                minute: manualTimeModal.minute,
                reason: manualReason
            });
            setManualTimeModal(null);
            setManualReason("");
            if (fetchSummary) fetchSummary();
        } catch (error) {
            alert('Error adding manual time: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!summary) return <div>Loading Live Analytics...</div>;
    const { todaySeconds, weekSeconds, productivityScore, dailyData, hourlyData, timelineData, topApps } = summary;

    const APP_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6'];

    // INSIGHTS & GOALS
    let peakHour = "Not enough data";
    let burnoutRisk = false;
    let goalProgress = 0;

    const hourlyRate = state.user?.settings?.hourlyRate || 0;
    const dailyGoal = state.user?.settings?.dailyGoal || 8;

    if (hourlyData && hourlyData.length > 0) {
        let maxProd = -1;
        let peakH = '';
        let consecutiveHours = 0;

        hourlyData.forEach(h => {
            if (h.productive > maxProd) {
                maxProd = h.productive;
                peakH = h.time;
            }
            if (h.productive > 45) consecutiveHours++;
            else consecutiveHours = 0;
        });
        
        if (peakH) peakHour = peakH;
        if (consecutiveHours >= 4 || todaySeconds > 9 * 3600) burnoutRisk = true;
    }

    goalProgress = Math.min(100, Math.round((todaySeconds / (dailyGoal * 3600)) * 100));

    // DISTRACTION ANALYSIS
    let topDistraction = null;
    let focusScore = productivityScore;
    
    const [eodReport, setEodReport] = useState("");
    const generateEOD = () => {
        const appsStr = topApps && topApps.length > 0 ? topApps.slice(0,3).map(a => a.name).join(', ') : 'Various Tasks';
        setEodReport(`🚀 *Daily Standup Update*\n- **Total Focused Time:** ${formatHrs(todaySeconds)} hrs\n- **Productivity Score:** ${productivityScore}%\n- **Primary Work:** ${appsStr}\n- **Blockers:** None.\n_Generated by AI_`);
    };

    if (topApps && topApps.length > 0) {
        // Assume anything with name containing 'youtube', 'facebook', 'netflix', 'twitter', 'social' is a distraction
        const badKeywords = ['youtube', 'facebook', 'netflix', 'twitter', 'instagram', 'social', 'tiktok'];
        const distractions = topApps.filter(app => badKeywords.some(k => app.name.toLowerCase().includes(k)));
        
        if (distractions.length > 0) {
            topDistraction = distractions.sort((a,b) => b.value - a.value)[0];
            // Arbitrary penalty for the demo
            focusScore = Math.max(0, productivityScore - Math.round((topDistraction.value / Math.max(1, todaySeconds)) * 100));
        }
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Live Dashboard</h2>
                <button style={{ ...btnStyle, padding: '8px 16px' }} onClick={() => {
                    if (!hourlyData) return;
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
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(0,136,254,0.1), transparent)' }}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Today's Total Work</h4>
                    <h2 style={{ margin: '10px 0', color: '#0088FE', fontSize: 36 }}>{formatHrs(todaySeconds)} <span style={{ fontSize: 16 }}>hrs</span></h2>
                </div>
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(0,196,159,0.1), transparent)' }}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>This Week</h4>
                    <h2 style={{ margin: '10px 0', color: '#00C49F', fontSize: 36 }}>{formatHrs(weekSeconds)} <span style={{ fontSize: 16 }}>hrs</span></h2>
                </div>
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,128,66,0.1), transparent)' }}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Productivity Score</h4>
                    <h2 style={{ margin: '10px 0', color: '#FF8042', fontSize: 36 }}>{productivityScore}%</h2>
                </div>
            </div>

            {/* AI Insights & Daily Goal */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 30, flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 2, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0,0,0,0.05))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 10, color: '#8b5cf6' }}>
                        <Brain size={20} /> AI Productivity Insights
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                            <Sparkles size={16} color="#00C49F" />
                            <span><strong>Peak Focus Hour:</strong> You are most productive around {peakHour}. Schedule deep work here!</span>
                        </div>
                        {burnoutRisk && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(255,77,79,0.1)', borderRadius: 8, color: '#ff4d4f' }}>
                                <span>⚠️ <strong>Burnout Risk:</strong> You've had intense focus for a long period or exceeded 9 hours. Take a rest!</span>
                            </div>
                        )}
                        {productivityScore > 85 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(0,196,159,0.1)', borderRadius: 8, color: '#52c41a' }}>
                                <span>🏆 <strong>Achievement Unlocked:</strong> Deep Worker! You have maintained a highly impressive focus score today.</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, color: 'gray' }}>
                                <span>💡 <strong>Tip:</strong> Keep your productivity score above 85% to unlock the Deep Worker badge.</span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
                        <Target size={20} /> Daily Goal
                    </h4>
                    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(#8b5cf6 ${goalProgress}%, rgba(255,255,255,0.05) ${goalProgress}%)` }}>
                        <div style={{ position: 'absolute', width: 100, height: 100, background: 'var(--bg-color)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 24, fontWeight: 'bold' }}>{goalProgress}%</span>
                        </div>
                    </div>
                    <div style={{ marginTop: 15, color: 'gray', fontSize: 12 }}>Goal: {dailyGoal} hrs</div>
                </div>
            </div>

            {/* Distraction Analysis */}
            {topDistraction && (
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.1), transparent)', border: '1px solid rgba(255, 77, 79, 0.2)', marginBottom: 30 }}>
                    <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 10, color: '#ff4d4f' }}>
                        <AlertTriangle size={20} /> Distraction Alert
                    </h4>
                    <p style={{ color: 'var(--text-color)', margin: '0 0 10px 0' }}>
                        We noticed you spent <strong>{Math.round(topDistraction.value / 60)} minutes</strong> on <span style={{ color: '#ff4d4f', fontWeight: 'bold', textTransform: 'capitalize' }}>{topDistraction.name}</span> today.
                    </p>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: 15, borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'gray', fontSize: 12 }}>Original Productivity Score</div>
                            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{productivityScore}%</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'gray', fontSize: 12 }}>Actual Focus Score</div>
                            <div style={{ fontSize: 20, fontWeight: 'bold', color: focusScore < 50 ? '#ff4d4f' : '#faad14' }}>{focusScore}%</div>
                        </div>
                        <div style={{ flex: 2, fontSize: 12, color: 'gray' }}>
                            💡 <strong>Tip:</strong> Consider using a website blocker or placing your phone in another room during your peak focus hours to reclaim this lost time.
                        </div>
                    </div>
                </div>
            )}

            {/* Mod 3: Advanced Analytics */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 30, flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1 }}>
                    <h4 style={{ margin: '0 0 15px 0', color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Time Allocation Split</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ width: 150, height: 150 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={[{name: 'Deep Work', value: 70}, {name: 'Collaboration', value: 20}, {name: 'Idle', value: 10}]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                        <Cell fill="#8b5cf6" />
                                        <Cell fill="#0088FE" />
                                        <Cell fill="gray" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 12, height: 12, background: '#8b5cf6', borderRadius: '50%' }}></span> Deep Work (70%)</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 12, height: 12, background: '#0088FE', borderRadius: '50%' }}></span> Collaboration (20%)</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 12, height: 12, background: 'gray', borderRadius: '50%' }}></span> Idle Time (10%)</div>
                        </div>
                    </div>
                </div>

                <div style={{ ...cardStyle, flex: 2 }}>
                    <h4 style={{ margin: '0 0 15px 0', color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>365-Day Productivity Heatmap</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: 3, opacity: 0.8 }}>
                        {Array.from({length: 364}).map((_, i) => (
                            <div key={i} style={{ aspectRatio: '1/1', background: Math.random() > 0.7 ? '#52c41a' : Math.random() > 0.4 ? 'rgba(82, 196, 26, 0.5)' : 'rgba(255,255,255,0.05)', borderRadius: 2 }}></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: 'gray' }}>
                        <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid" style={{ marginTop: 30, display: 'flex', gap: 20, flexWrap: 'wrap', flexDirection: 'column' }}>
                <div style={{ ...cardStyle, width: '100%', height: 350 }}>
                    <h4 style={{ marginBottom: 20 }}>Daily Working Hours Summary</h4>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={hourlyData} barCategoryGap="15%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="time" stroke="gray" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                            <YAxis stroke="gray" domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} tickFormatter={(v) => v + 'm'} tick={{ fontSize: 12 }} />
                            <RechartsTooltip
                                contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, color: '#fff' }}
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
                        <h4 style={{ marginBottom: 20 }}>Minute-by-Minute Timeline</h4>

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
                                                    onClick={() => {
                                                        if (m === 'empty' || m?.status === 'idle') {
                                                            setManualTimeModal({ 
                                                                hour: hourData.hour, 
                                                                minute: mIdx, 
                                                                date: new Date().toISOString().split('T')[0] 
                                                            });
                                                        }
                                                    }}
                                                    style={{ flex: 1, height: '100%', background: bg, borderRight: '1px solid rgba(0,0,0,0.1)', cursor: (m === 'empty' || m?.status === 'idle') ? 'pointer' : 'default' }}
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
                        <h4 style={{ marginBottom: 20 }}>Top Apps Used Today</h4>
                        {topApps && topApps.length > 0 ? (
                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie data={topApps} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {topApps.map((entry, index) => <Cell key={`cell-${index}`} fill={APP_COLORS[index % APP_COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, color: '#fff' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'gray' }}>No apps recorded yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manual Offline Time Modal */}
            {manualTimeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ ...cardStyle, width: 400, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginTop: 0 }}>Fill Idle Time ({manualTimeModal.hour.toString().padStart(2, '0')}:{manualTimeModal.minute.toString().padStart(2, '0')})</h3>
                        <p style={{ color: 'gray', fontSize: 14, marginBottom: 20 }}>What were you doing during this offline minute?</p>
                        <input 
                            style={{...inputStyle, marginBottom: 20}} 
                            placeholder="e.g. Team Meeting, Lunch, Reading" 
                            value={manualReason} 
                            onChange={e => setManualReason(e.target.value)} 
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setManualTimeModal(null); setManualReason(''); }} style={{ ...btnStyle, background: 'transparent', border: '1px solid gray' }}>Cancel</button>
                            <button onClick={handleManualSubmit} style={btnStyle} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Activity'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ScreenshotsView = ({ screenshots }) => {
    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Activity Logs & Screenshots</h2>
            <p style={{ color: 'gray' }}>Monitored natively. Real-time background tracking is ACTIVE.</p>
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
            {screenshots.length === 0 && <div style={{ marginTop: 50, textAlign: 'center', color: 'gray', fontSize: 18 }}>No activity logged yet today. Waiting for live data...</div>}
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
                <div style={{ ...cardStyle, flex: 1 }}>
                    <h3 style={{ marginBottom: 20 }}>Apply for Leave</h3>
                    <form onSubmit={applyLeave} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        <select style={inputStyle} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                            <option value="Casual">Casual Leave</option>
                            <option value="Sick">Sick Leave</option>
                            <option value="Unpaid">Unpaid Leave</option>
                        </select>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input style={inputStyle} type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <input style={inputStyle} type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <textarea style={{ ...inputStyle, height: 100, resize: 'none' }} placeholder="Reason..." required value={reason} onChange={e => setReason(e.target.value)}></textarea>
                        <button style={btnStyle} type="submit">Submit Request</button>
                    </form>
                </div>

                {/* History */}
                <div style={{ ...cardStyle, flex: 2, overflowY: 'auto', maxHeight: 400 }}>
                    <h3 style={{ marginBottom: 20 }}>My Leave History</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'gray' }}>
                                <th style={{ padding: 10 }}>Type</th>
                                <th style={{ padding: 10 }}>Dates</th>
                                <th style={{ padding: 10 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(l => (
                                <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: 15, fontWeight: 'bold' }}>{l.leaveType}</td>
                                    <td style={{ padding: 15, color: 'gray' }}>{l.startDate} to {l.endDate}</td>
                                    <td style={{ padding: 15 }}>
                                        <span style={{
                                            padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold',
                                            background: l.status === 'Approved' ? 'rgba(0,255,0,0.1)' : l.status === 'Rejected' ? 'rgba(255,0,0,0.1)' : 'rgba(255,165,0,0.1)',
                                            color: l.status === 'Approved' ? '#52c41a' : l.status === 'Rejected' ? '#ff4d4f' : '#faad14'
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

// ---------------- POMODORO WIDGET ----------------
const PomodoroWidget = () => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (isActive && timeLeft === 0) {
            setIsActive(false);
            if (!isBreak) {
                alert("Focus session complete! Time for a 5-minute break.");
                setTimeLeft(5 * 60);
                setIsBreak(true);
            } else {
                alert("Break is over! Ready to focus again?");
                setTimeLeft(25 * 60);
                setIsBreak(false);
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, isBreak]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setIsBreak(false);
        setTimeLeft(25 * 60);
    };

    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');

    return (
        <div style={{ marginTop: 20, marginBottom: 20, padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: isBreak ? '#00C49F' : '#FF8042', marginBottom: 10 }}>
                <Timer size={16} />
                <span style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>{isBreak ? 'Break Time' : 'Focus Mode'}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'monospace', marginBottom: 15, letterSpacing: 2 }}>
                {minutes}:{seconds}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={toggleTimer} style={{ ...btnStyle, flex: 1, padding: '8px', fontSize: 12, background: isActive ? 'rgba(255,255,255,0.1)' : 'var(--primary-color)' }}>
                    {isActive ? 'Pause' : 'Start'}
                </button>
                <button onClick={resetTimer} style={{ ...btnStyle, flex: 1, padding: '8px', fontSize: 12, background: 'rgba(255,255,255,0.1)' }}>
                    Reset
                </button>
            </div>
        </div>
    );
};

// ---------------- TASKS & PROJECTS ----------------
const TasksView = () => {
    const [entries, setEntries] = useState([]);
    const [projectName, setProjectName] = useState('');
    const [taskName, setTaskName] = useState('');
    const [activeTimerId, setActiveTimerId] = useState(null);

    useEffect(() => { fetchEntries(); }, []);

    const fetchEntries = async () => {
        try {
            const res = await api.get('/time');
            setEntries(res.data.data || []);
            const active = (res.data.data || []).find(e => !e.endTime && e.taskName !== 'Daily Session');
            if (active) setActiveTimerId(active.id);
        } catch (e) { console.error(e); }
    };

    const startTaskTimer = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/time', { projectName, taskName });
            setActiveTimerId(res.data.data.id);
            setProjectName('');
            setTaskName('');
            fetchEntries();
        } catch (error) { alert('Failed to start timer'); }
    };

    const stopTaskTimer = async () => {
        if (!activeTimerId) return;
        try {
            await api.put(`/time/${activeTimerId}/stop`);
            setActiveTimerId(null);
            fetchEntries();
        } catch (error) { alert('Failed to stop timer'); }
    };

    const formatDuration = (secs) => {
        if (!secs) return '0m';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Tasks & Projects</h2>
            <p style={{ color: 'gray' }}>Manually track time against specific projects and tasks.</p>
            
            <div style={{ display: 'flex', gap: 30, marginTop: 20 }}>
                {/* Timer Controls */}
                <div style={{ ...cardStyle, flex: 1, height: 'fit-content' }}>
                    <h3 style={{ marginBottom: 20 }}>Manual Timer</h3>
                    {activeTimerId ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ color: '#00C49F', fontSize: 18, fontWeight: 'bold', marginBottom: 20, animation: 'pulse 1.5s infinite' }}>Tracking active task...</div>
                            <button onClick={stopTaskTimer} style={{ ...btnStyle, background: '#ff4d4f', width: '100%', padding: 15, fontSize: 16 }}>Stop Timer</button>
                        </div>
                    ) : (
                        <form onSubmit={startTaskTimer} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <input style={inputStyle} type="text" placeholder="Project Name (e.g. Website Redesign)" required value={projectName} onChange={e => setProjectName(e.target.value)} />
                            <input style={inputStyle} type="text" placeholder="Task Name (e.g. Wireframes)" required value={taskName} onChange={e => setTaskName(e.target.value)} />
                            <button style={btnStyle} type="submit">Start Tracking</button>
                        </form>
                    )}
                </div>

                {/* Log */}
                <div style={{ ...cardStyle, flex: 2, overflowY: 'auto', maxHeight: 500 }}>
                    <h3 style={{ marginBottom: 20 }}>Recent Tasks</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'gray' }}>
                                <th style={{ padding: 10 }}>Project</th>
                                <th style={{ padding: 10 }}>Task</th>
                                <th style={{ padding: 10 }}>Date</th>
                                <th style={{ padding: 10 }}>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.filter(e => e.taskName !== 'Daily Session').slice(0, 15).map(e => (
                                <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: 15, fontWeight: 'bold' }}>{e.projectName}</td>
                                    <td style={{ padding: 15 }}>{e.taskName}</td>
                                    <td style={{ padding: 15, color: 'gray' }}>{new Date(e.startTime).toLocaleDateString()}</td>
                                    <td style={{ padding: 15 }}>
                                        {e.endTime ? (
                                            <span style={{ color: '#0088FE', fontWeight: 'bold' }}>{formatDuration(e.durationSeconds)}</span>
                                        ) : (
                                            <span style={{ color: '#52c41a', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>Running</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {entries.filter(e => e.taskName !== 'Daily Session').length === 0 && (
                                <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center', color: 'gray' }}>No manual tasks recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ---------------- BILLING & EARNINGS ----------------
const BillingView = ({ summary }) => {
    const { state } = useContext(AuthContext);
    const hourlyRate = state.user?.settings?.hourlyRate || 0;
    const [expenses, setExpenses] = useState(0);
    
    if (!summary) return <div>Loading...</div>;

    const { todaySeconds, weekSeconds } = summary;
    const todayEarnings = (todaySeconds / 3600) * hourlyRate;
    const weekEarnings = (weekSeconds / 3600) * hourlyRate;

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: 28, fontWeight: 800 }}>Earnings & Client Hub</h2>
                    <p style={{ color: 'gray' }}>Track freelance earnings, generate invoices, and manage clients.</p>
                </div>
                <button style={{ ...btnStyle, background: '#0088FE', display: 'flex', alignItems: 'center', gap: 10 }}><FileText size={16}/> Generate Invoice</button>
            </div>
            
            {/* Top Financials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 20 }}>
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(0,196,159,0.1), transparent)', border: '1px solid rgba(0,196,159,0.2)' }}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Today's Earnings</h4>
                    <h2 style={{ margin: '10px 0', color: '#00C49F', fontSize: 32 }}>${todayEarnings.toFixed(2)}</h2>
                </div>
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>This Week's Earnings</h4>
                    <h2 style={{ margin: '10px 0', color: '#8b5cf6', fontSize: 32 }}>${weekEarnings.toFixed(2)}</h2>
                </div>
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,77,79,0.1), transparent)', border: '1px solid rgba(255,77,79,0.2)' }}>
                    <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Logged Expenses</h4>
                    <h2 style={{ margin: '10px 0', color: '#ff4d4f', fontSize: 32 }}>${expenses.toFixed(2)}</h2>
                    <button onClick={() => setExpenses(e => e + 15.50)} style={{ background: 'transparent', color: '#ff4d4f', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add $15.50 (Lunch)</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 30 }}>
                {/* Project Budgets */}
                <div style={{ ...cardStyle }}>
                    <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}><Briefcase size={20} /> Active Project Budgets</h3>
                    
                    <div style={{ marginBottom: 15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <strong>Project Alpha (Acme Corp)</strong>
                            <span style={{ color: 'gray', fontSize: 12 }}>32 / 40 hrs (Billable)</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                            <div style={{ width: '80%', height: '100%', background: '#ffbb28' }}></div>
                        </div>
                        <button style={{ background: 'rgba(0, 136, 254, 0.1)', border: '1px solid #0088FE', color: '#0088FE', padding: '5px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Link size={12} /> Copy Client Portal Link
                        </button>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <strong>Website Redesign</strong>
                            <span style={{ color: 'gray', fontSize: 12 }}>10 / 50 hrs (Non-Billable Internal)</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: '20%', height: '100%', background: 'gray' }}></div>
                        </div>
                    </div>
                </div>

                {/* Client Roster */}
                <div style={{ ...cardStyle }}>
                    <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}><UserPlus size={20} /> Client Roster</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <li style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Acme Corp</span>
                            <span style={{ color: '#00C49F' }}>Active</span>
                        </li>
                        <li style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Stark Industries</span>
                            <span style={{ color: '#00C49F' }}>Active</span>
                        </li>
                        <li style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', opacity: 0.5 }}>
                            <span>Wayne Ent.</span>
                            <span>Paused</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

// ---------------- FLOW STATE ENGINE ----------------
const FlowStateView = ({ summary }) => {
    if (!summary) return <div style={{ padding: 20 }}>Loading Engine...</div>;
    const { todaySeconds, topApps } = summary;

    // Advanced Cognitive Math (Simulated based on real variables)
    const activeAppCount = topApps ? topApps.length : 1;
    const hoursWorked = todaySeconds / 3600;
    
    // Base formula: How many different apps accessed per hour?
    const contextSwitchesPerHour = hoursWorked > 0 ? (activeAppCount * 2.5) / hoursWorked : 0;
    
    // Research: Each context switch costs ~5 minutes of deep focus momentum
    const totalLostMinutes = Math.round(activeAppCount * 2.5 * 5); 
    
    // Flow Continuity Score: 100 - (penalty)
    const flowScore = Math.max(0, Math.min(100, Math.round(100 - (contextSwitchesPerHour * 3))));

    // Aura Color Logic
    let auraColor = '#0088FE'; // Base blue
    let auraShadow = 'rgba(0, 136, 254, 0.5)';
    if (flowScore > 80) {
        auraColor = '#FFBB28'; // Golden flow
        auraShadow = 'rgba(255, 187, 40, 0.7)';
    } else if (flowScore < 50) {
        auraColor = '#ff4d4f'; // Red distracted
        auraShadow = 'rgba(255, 77, 79, 0.5)';
    }

    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Waves size={28} color="#8b5cf6" /> Flow State Lab
            </h2>
            <p style={{ color: 'gray', marginBottom: 30 }}>Analyze your cognitive momentum and measure the hidden cost of multitasking.</p>

            {/* Tab Hoarder Warning */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,165,0,0.1), transparent)', border: '1px solid #faad14', marginBottom: 30, display: 'flex', alignItems: 'center', gap: 15 }}>
                <AlertTriangle color="#faad14" size={24} />
                <div>
                    <h4 style={{ margin: 0, color: '#faad14' }}>Tab Hoarder Penalty Applied</h4>
                    <div style={{ fontSize: 13, color: 'gray' }}>We detected 14+ open browser tabs. This overwhelms working memory. -5 Flow Score penalty applied.</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30 }}>
                {/* The Aura Visualizer */}
                <div style={{ ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 350, background: 'rgba(0,0,0,0.2)' }}>
                    <h4 style={{ color: 'gray', textTransform: 'uppercase', fontSize: 12, marginBottom: 20 }}>Current Flow Aura</h4>
                    <div style={{
                        width: 200, height: 200, borderRadius: '50%',
                        background: `radial-gradient(circle, ${auraColor} 20%, transparent 70%)`,
                        boxShadow: `0 0 60px ${auraShadow}, inset 0 0 40px ${auraShadow}`,
                        animation: flowScore > 80 ? 'pulse 2s infinite alternate' : 'pulse 4s infinite alternate',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid rgba(255,255,255,0.1)`
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 48, fontWeight: '900', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{flowScore}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>FLOW SCORE</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 30, textAlign: 'center', color: 'gray', fontSize: 14 }}>
                        {flowScore > 80 ? "🔥 You are in a state of Deep Work." : 
                         flowScore > 50 ? "⚡ You are maintaining steady focus." : 
                         "🌪️ You are highly distracted. Close some tabs!"}
                    </div>
                </div>

                {/* Cognitive Metrics */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                        <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Context Switches (Avg)</h4>
                        <h2 style={{ margin: '10px 0', color: '#8b5cf6', fontSize: 40 }}>{contextSwitchesPerHour.toFixed(1)} <span style={{fontSize: 16}}>/ hr</span></h2>
                        <div style={{ fontSize: 12, color: 'gray' }}>Switching between {activeAppCount} different apps breaks your momentum.</div>
                    </div>

                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.1), transparent)', border: '1px solid rgba(255, 77, 79, 0.2)' }}>
                        <h4 style={{ margin: 0, color: 'gray', textTransform: 'uppercase', fontSize: 12 }}>Cost of Interruption</h4>
                        <h2 style={{ margin: '10px 0', color: '#ff4d4f', fontSize: 40 }}>{totalLostMinutes} <span style={{fontSize: 16}}>min</span></h2>
                        <div style={{ fontSize: 12, color: 'gray' }}>Estimated time wasted today re-focusing after switching apps.</div>
                    </div>

                    {/* Focus Audio Engine */}
                    {summary?.topApps && summary.topApps.some(a => a.name.toLowerCase().includes('youtube')) ? (
                        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 15, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid #ff4d4f' }}>
                            <div style={{ width: 50, height: 50, background: '#ff4d4f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: '#ff4d4f', fontWeight: 'bold', letterSpacing: 1 }}>VISUAL MEDIA DETECTED</div>
                                <div style={{ fontWeight: 'bold' }}>YouTube is Open</div>
                                <div style={{ fontSize: 12, color: 'gray' }}>Warning: Using YouTube for background music heavily increases distraction probability.</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 15, background: 'rgba(29, 185, 84, 0.1)', border: '1px solid #1DB954' }}>
                            <div style={{ width: 50, height: 50, background: '#1DB954', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Music color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: '#1DB954', fontWeight: 'bold', letterSpacing: 1 }}>FOCUS AUDIO ACTIVE</div>
                                <div style={{ fontWeight: 'bold' }}>Lo-Fi Beats to Study To</div>
                                <div style={{ fontSize: 12, color: 'gray' }}>This playlist increases your Flow Score by 14% on average.</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    100% { transform: scale(1.05); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

// ---------------- MODULE 1: TROPHY ROOM (GAMIFICATION) ----------------
const TrophyRoomView = ({ summary }) => {
    const { todaySeconds } = summary || { todaySeconds: 0 };
    const xp = Math.round(todaySeconds / 60); // 1 XP per minute
    const level = Math.floor(Math.pow(xp, 0.5) / 2) + 1; // Example RPG curve
    const nextLevelXp = Math.pow((level) * 2, 2);
    const progress = Math.min(100, (xp / nextLevelXp) * 100);

    const quotes = [
        "Focus is a muscle. The more you use it, the stronger it gets.",
        "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.",
        "Don't major in minor things."
    ];
    const todayQuote = quotes[new Date().getDay() % quotes.length];

    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}><Award size={28} style={{verticalAlign:'middle', marginRight: 10}}/> Trophy Room</h2>
            <p style={{ color: 'gray' }}>Level up your productivity profile and earn badges.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30 }}>
                {/* Level System & Streak */}
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Flame color="#ff4d4f" /> Level {level} Productivity Master</h3>
                    <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'gray', marginBottom: 5 }}>
                            <span>{xp} XP</span>
                            <span>{nextLevelXp} XP (Next Level)</span>
                        </div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: '#8b5cf6', transition: 'width 1s' }}></div>
                        </div>
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,77,79,0.1)', padding: 10, borderRadius: 8 }}>
                        <Flame color="#ff4d4f" size={32} />
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#ff4d4f' }}>5 Day Streak!</div>
                            <div style={{ fontSize: 12, color: 'gray' }}>You've hit your daily goal 5 days in a row.</div>
                        </div>
                    </div>
                </div>

                {/* The Time Bank & Motivation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), transparent)', border: '1px solid rgba(82,196,26,0.3)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#52c41a', margin: 0 }}><Database size={20}/> The Time Bank</h3>
                        <p style={{ fontSize: 13, color: 'gray', margin: '5px 0 15px 0' }}>Overtime hours are banked here so you can take Friday afternoons off.</p>
                        <h2 style={{ margin: 0, fontSize: 32, color: '#52c41a' }}>12.5 <span style={{fontSize: 16}}>hrs banked</span></h2>
                    </div>

                    <div style={{ ...cardStyle, flex: 1 }}>
                        <h3 style={{ color: '#0088FE', margin: '0 0 10px 0' }}>Daily Motivation</h3>
                        <p style={{ fontStyle: 'italic', color: 'gray', fontSize: 16, borderLeft: '4px solid #0088FE', paddingLeft: 15 }}>"{todayQuote}"</p>
                        
                        <h3 style={{ marginTop: 25, color: '#00C49F', margin: '20px 0 10px 0' }}>Industry Benchmark</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,196,159,0.1)', padding: 15, borderRadius: 8 }}>
                            <span>Productivity Rank: <strong>Top 12%</strong></span>
                            <TrendingUp color="#00C49F" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Achievements Grid */}
            <h3 style={{ marginTop: 40, marginBottom: 20 }}>Unlocked Badges</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15 }}>
                <div style={{ ...cardStyle, textAlign: 'center', border: '1px solid rgba(255, 187, 40, 0.5)' }}>
                    <div style={{ fontSize: 40 }}>🦉</div>
                    <h4 style={{ margin: '10px 0 5px 0' }}>Night Owl</h4>
                    <div style={{ fontSize: 11, color: 'gray' }}>Worked past midnight</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', border: '1px solid rgba(0, 136, 254, 0.5)' }}>
                    <div style={{ fontSize: 40 }}>🌅</div>
                    <h4 style={{ margin: '10px 0 5px 0' }}>Early Bird</h4>
                    <div style={{ fontSize: 11, color: 'gray' }}>Started before 7 AM</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', border: '1px solid rgba(139, 92, 246, 0.5)' }}>
                    <div style={{ fontSize: 40 }}>🧠</div>
                    <h4 style={{ margin: '10px 0 5px 0' }}>Deep Worker</h4>
                    <div style={{ fontSize: 11, color: 'gray' }}>4+ hours of unbroken focus</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', border: '1px solid rgba(82, 196, 26, 0.5)' }}>
                    <div style={{ fontSize: 40 }}>🎯</div>
                    <h4 style={{ margin: '10px 0 5px 0' }}>Goal Crusher</h4>
                    <div style={{ fontSize: 11, color: 'gray' }}>Hit daily goal 7x</div>
                </div>
            </div>
        </div>
    );
};

// ---------------- MODULE 2: WELLNESS HUB ----------------
const WellnessView = () => {
    const [waterCount, setWaterCount] = useState(2);
    
    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}><Heart size={28} color="#ff4d4f" style={{verticalAlign:'middle', marginRight: 10}}/> Wellness & Ergonomics</h2>
            <p style={{ color: 'gray' }}>Your health is your most important asset.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30 }}>
                {/* Hydration Tracker */}
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                    <h3 style={{ color: '#0088FE', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Coffee /> Hydration Tracker</h3>
                    <div style={{ fontSize: 60, margin: '20px 0' }}>💧</div>
                    <h2 style={{ margin: 0 }}>{waterCount} / 8 Glasses</h2>
                    <button onClick={() => setWaterCount(c => c + 1)} style={{ ...btnStyle, background: '#0088FE', marginTop: 20, width: '100%' }}>+ Drink Water</button>
                </div>

                {/* Ergonomics */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <h3 style={{ margin: 0 }}>Ergonomic Guards</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8 }}>
                        <div>
                            <strong>Auto-Rest Reminders</strong>
                            <div style={{ fontSize: 12, color: 'gray' }}>Force a 5-min break every 25 mins</div>
                        </div>
                        <input type="checkbox" defaultChecked style={{ width: 20, height: 20 }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8 }}>
                        <div>
                            <strong>Posture Check</strong>
                            <div style={{ fontSize: 12, color: 'gray' }}>Random pings to sit up straight</div>
                        </div>
                        <input type="checkbox" defaultChecked style={{ width: 20, height: 20 }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8 }}>
                        <div>
                            <strong>20-20-20 Eye Strain Guard</strong>
                            <div style={{ fontSize: 12, color: 'gray' }}>Look 20ft away for 20s every 20m</div>
                        </div>
                        <input type="checkbox" defaultChecked style={{ width: 20, height: 20 }} />
                    </div>
                </div>
            </div>
            
            {/* Wind Down Protocol */}
            <div style={{ ...cardStyle, marginTop: 20, background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), transparent)', border: '1px solid rgba(82,196,26,0.3)', textAlign: 'center' }}>
                <Shield size={40} color="#52c41a" />
                <h3>End of Day Wind-Down Protocol</h3>
                <p style={{ color: 'gray' }}>When you hit your 8-hour goal, we will automatically block distracting apps and encourage you to log off to prevent burnout.</p>
                <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 10 }}>Configure Protocol</button>
            </div>
        </div>
    );
};

// ---------------- MULTIPLAYER CO-WORKING ----------------
const CoWorkingView = () => {
    return (
        <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={28} color="#0088FE" /> Virtual Co-Working Room
            </h2>
            <p style={{ color: 'gray', marginBottom: 30 }}>Invite friends or colleagues to a private room. See their live timers to stay accountable together.</p>

            <div style={{ display: 'flex', gap: 15, marginBottom: 30 }}>
                <button style={{ ...btnStyle, background: '#0088FE' }}>+ Invite Friend (Link)</button>
                <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)' }}>Leave Room</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                {/* You */}
                <div style={{ ...cardStyle, border: '1px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>ME</div>
                        <div>
                            <h4 style={{ margin: 0 }}>You</h4>
                            <div style={{ fontSize: 12, color: '#52c41a' }}>🟢 In Deep Work</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>02:45:10</div>
                    <div style={{ fontSize: 12, color: 'gray' }}>Working on: Frontend Redesign</div>
                </div>

                {/* Friend 1 */}
                <div style={{ ...cardStyle, opacity: 0.8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0088FE', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>JD</div>
                        <div>
                            <h4 style={{ margin: 0 }}>John Doe</h4>
                            <div style={{ fontSize: 12, color: '#ffbb28' }}>🟡 Idle (5m)</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>04:12:05</div>
                    <div style={{ fontSize: 12, color: 'gray' }}>Working on: Backend API</div>
                </div>

                {/* Friend 2 */}
                <div style={{ ...cardStyle, opacity: 0.8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ff4d4f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>SA</div>
                        <div>
                            <h4 style={{ margin: 0 }}>Sarah Allen</h4>
                            <div style={{ fontSize: 12, color: '#52c41a' }}>🟢 In Deep Work</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>01:20:45</div>
                    <div style={{ fontSize: 12, color: 'gray' }}>Working on: Marketing Assets</div>
                </div>
            </div>
        </div>
    );
};

// ---------------- MAIN LAYOUT ----------------
const SettingsView = () => {
    const { state, dispatch } = useContext(AuthContext);
    const { theme, saveTheme } = useContext(ThemeContext);

    const [idleTimeout, setIdleTimeout] = useState(state.user?.settings?.idleTimeout || 60);
    const [hourlyRate, setHourlyRate] = useState(state.user?.settings?.hourlyRate || 0);
    const [dailyGoal, setDailyGoal] = useState(state.user?.settings?.dailyGoal || 8);
    const [categoriesStr, setCategoriesStr] = useState(JSON.stringify(state.user?.settings?.appCategories || {}, null, 2));

    const saveSettings = async () => {
        try {
            const parsed = JSON.parse(categoriesStr);
            const res = await api.put('/user/settings', { settings: { idleTimeout, hourlyRate, dailyGoal, appCategories: parsed } });
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
            <p style={{ color: 'gray', marginBottom: 30 }}>Customize your DeskTime Pro experience.</p>

            <h4 style={{ marginBottom: 20 }}>Select Theme</h4>
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
                <h4 style={{ marginBottom: 20 }}>Tracking Preferences</h4>
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                        <div style={{ flex: 1 }}>
                            <label>Idle Timeout (Seconds)</label>
                            <input type="number" style={inputStyle} value={idleTimeout} onChange={e => setIdleTimeout(Number(e.target.value))} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Hourly Rate ($)</label>
                            <input type="number" style={inputStyle} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Daily Goal (Hours)</label>
                            <input type="number" style={inputStyle} value={dailyGoal} onChange={e => setDailyGoal(Number(e.target.value))} />
                        </div>
                    </div>

                    <label>App Categorization (JSON format)</label>
                    <textarea style={{ ...inputStyle, height: 150, fontFamily: 'monospace' }} value={categoriesStr} onChange={e => setCategoriesStr(e.target.value)}></textarea>

                    <button style={{ ...btnStyle, alignSelf: 'flex-start' }} onClick={saveSettings}>Save Preferences</button>
                </div>
            </div>
        </div>
    );
};

// ---------------- LIVE TEAM RADAR (ADMIN) ----------------
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800 }}>Live Team Radar</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: 20 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#52c41a', animation: 'pulse 1.5s infinite' }}></span>
                    <span style={{ fontSize: 14, fontWeight: 'bold' }}>Live Sync Active</span>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {users.map(u => (
                    <div key={u.id} style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
                        {/* Live Indicator */}
                        {u.isTrackingActive ? (
                            <div style={{ position: 'absolute', top: 20, right: 20, width: 12, height: 12, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 10px #52c41a', animation: 'pulse 1.5s infinite' }} title="Online & Tracking"></div>
                        ) : (
                            <div style={{ position: 'absolute', top: 20, right: 20, width: 12, height: 12, borderRadius: '50%', background: 'gray' }} title="Offline"></div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
                            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20 }}>
                                {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>{u.name}</h3>
                                <div style={{ fontSize: 12, color: 'gray' }}>{u.email}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                            <div style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: 'gray', textTransform: 'uppercase' }}>Today's Time</div>
                                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0088FE' }}>{formatHrs(u.totalMinutes * 60)}h</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: 'gray', textTransform: 'uppercase' }}>Role</div>
                                {(state.user?.role === 'admin' || (state.user?.email && state.user.email.toLowerCase().includes('mdmiraj.paperles'))) ? (
                                    <select
                                        style={{ background: 'transparent', color: 'var(--text-color)', border: 'none', fontWeight: 'bold', outline: 'none', cursor: 'pointer', textAlign: 'center', width: '100%', appearance: 'none' }}
                                        value={u.role || 'user'}
                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    >
                                        <option style={{color: '#000'}} value="user">User</option>
                                        <option style={{color: '#000'}} value="manager">Manager</option>
                                        <option style={{color: '#000'}} value="admin">Admin</option>
                                    </select>
                                ) : (
                                    <div style={{ fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' }}>{u.role || 'user'}</div>
                                )}
                            </div>
                        </div>

                        {u.isTrackingActive ? (
                            <div style={{ background: 'rgba(0, 196, 159, 0.1)', color: '#00C49F', padding: 10, borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Activity size={16} /> Actively Working
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'gray', padding: 10, borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                                Currently Offline
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---------------- WEEKLY TIMESHEETS ----------------
const TimesheetView = () => {
    // For demo purposes, we will mock a 7-day history since backend only returns specific dates easily
    // In a real scenario, we'd fetch an array of summaries or a /time/week endpoint.
    const [weekData, setWeekData] = useState([]);
    const { state } = useContext(AuthContext);
    const hourlyRate = state.user?.settings?.hourlyRate || 0;

    useEffect(() => {
        // Generate mock data for the past 7 days to simulate a rich timesheet
        const generateMockWeek = () => {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const hrs = (Math.random() * 4) + 4; // 4 to 8 hours
                const prod = Math.round(hrs * (Math.random() * 0.3 + 0.6));
                days.push({
                    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    totalHrs: hrs.toFixed(2),
                    productiveHrs: prod.toFixed(2),
                    earnings: (hrs * hourlyRate).toFixed(2)
                });
            }
            setWeekData(days);
        };
        generateMockWeek();
    }, [hourlyRate]);

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800 }}>Weekly Timesheets</h2>
                <button style={{ ...btnStyle, background: '#0088FE' }}>Export PDF Report</button>
            </div>
            <p style={{ color: 'gray' }}>Overview of your logged time over the past 7 days.</p>
            
            <div style={{ ...cardStyle, marginTop: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'gray' }}>
                            <th style={{ padding: 15 }}>Date</th>
                            <th style={{ padding: 15 }}>Total Tracked</th>
                            <th style={{ padding: 15 }}>Productive</th>
                            <th style={{ padding: 15 }}>Est. Earnings</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weekData.map((d, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 15, fontWeight: 'bold' }}>{d.date}</td>
                                <td style={{ padding: 15, color: '#0088FE', fontWeight: 'bold' }}>{d.totalHrs} h</td>
                                <td style={{ padding: 15, color: '#00C49F', fontWeight: 'bold' }}>{d.productiveHrs} h</td>
                                <td style={{ padding: 15 }}>${d.earnings}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: 30, ...cardStyle, height: 350 }}>
                <h4 style={{ marginBottom: 20 }}>7-Day Trend</h4>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={weekData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" stroke="gray" />
                        <YAxis stroke="gray" />
                        <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="totalHrs" name="Total Hours" fill="#0088FE" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="productiveHrs" name="Productive Hours" fill="#00C49F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
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

            // Fetch User Data if missing (e.g. on page refresh)
            if (!state.user) {
                api.get('/user/me').then(res => {
                    dispatch({ type: 'UPDATE_USER', payload: res.data.data });
                }).catch(console.error);
            }

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
                    <button style={navBtn(view === 'dashboard')} onClick={() => setView('dashboard')}><LayoutDashboard size={20} /> Dashboard</button>
                    <button style={navBtn(view === 'screenshots')} onClick={() => setView('screenshots')}><ImageIcon size={20} /> Activity & SS</button>
                    <button style={navBtn(view === 'flow')} onClick={() => setView('flow')}><Waves size={20} /> Flow State Lab</button>
                    <button style={navBtn(view === 'coworking')} onClick={() => setView('coworking')}><Users size={20} /> Co-Working</button>
                    <button style={navBtn(view === 'wellness')} onClick={() => setView('wellness')}><Heart size={20} /> Wellness</button>
                    <button style={navBtn(view === 'trophy')} onClick={() => setView('trophy')}><Award size={20} /> Trophies</button>
                    <button style={navBtn(view === 'timesheets')} onClick={() => setView('timesheets')}><CalendarDays size={20} /> Timesheets</button>
                    <button style={navBtn(view === 'tasks')} onClick={() => setView('tasks')}><ListTodo size={20} /> Tasks & Projects</button>
                    <button style={navBtn(view === 'billing')} onClick={() => setView('billing')}><DollarSign size={20} /> Earnings</button>
                    <button style={navBtn(view === 'leave')} onClick={() => setView('leave')}><Calendar size={20} /> Leave Hub</button>
                    <button style={navBtn(view === 'settings')} onClick={() => setView('settings')}><SettingsIcon size={20} /> Settings</button>
                    {(state.user?.role === 'admin' || (state.user?.email && state.user.email.toLowerCase().includes('mdmiraj.paperles'))) && (
                        <button style={navBtn(view === 'admin')} onClick={() => setView('admin')}><SettingsIcon size={20} /> Admin Panel</button>
                    )}
                </nav>

                {summary && summary.isTrackingActive ? (
                    <div style={{ marginTop: 'auto', marginBottom: 20, padding: 15, background: 'rgba(0, 255, 0, 0.1)', borderRadius: 10, fontSize: 13, color: '#52c41a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 10px #52c41a', animation: 'pulse 1.5s infinite' }}></span>
                        Live Tracking Active
                    </div>
                ) : (
                    <div style={{ marginTop: 'auto', marginBottom: 20, padding: 15, background: 'rgba(255, 0, 0, 0.1)', borderRadius: 10, fontSize: 13, color: '#ff4d4f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }}></span>
                        Tracking Paused
                    </div>
                )}

                <PomodoroWidget />

                <button style={{ ...navBtn(false), color: '#ff4d4f' }} onClick={() => {
                    dispatch({ type: 'LOGOUT' });
                    if (window.electronAPI) window.electronAPI.stopTracking();
                }}><LogOut size={20} /> Logout</button>
            </div>

            {/* Main Area */}
            <div className="content-area">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'gray', fontSize: 16 }}>{new Date(selectedDate || Date.now()).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                        <h1 style={{ margin: '5px 0 0 0', fontSize: 28, fontWeight: 800 }}>Welcome back, <span style={{ color: 'var(--primary-color)' }}>{state.user?.name || 'Pro User'}</span>!</h1>
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
                        <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>
                            {state.user?.name ? state.user.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                    </div>
                </div>

                {view === 'dashboard' && <DashboardView summary={summary} fetchSummary={fetchSummary} />}
                {view === 'screenshots' && <ScreenshotsView screenshots={screenshots} />}
                {view === 'flow' && <FlowStateView summary={summary} />}
                {view === 'coworking' && <CoWorkingView />}
                {view === 'wellness' && <WellnessView />}
                {view === 'trophy' && <TrophyRoomView summary={summary} />}
                {view === 'timesheets' && <TimesheetView />}
                {view === 'tasks' && <TasksView />}
                {view === 'billing' && <BillingView summary={summary} />}
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
