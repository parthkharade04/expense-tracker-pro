import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

function App() {
  const [expenses, setExpenses] = useState([])
  const [budget, setBudget] = useState(2000)
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)
  const [aiInsight, setAiInsight] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // API Base URL (Dynamic)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  // Fetch Expenses
  useEffect(() => {
    fetch(`${API_BASE_URL}/expenses`)
      .then(res => res.json())
      .then(data => {
        setExpenses(data)
        setLoading(false)
      })
      .catch(err => console.error("Error fetching expenses:", err))
  }, [])

  // Calculate stats
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0)

  // Calculate category statistics for the chart
  const categoryData = useMemo(() => {
    const data = {}
    expenses.forEach(expense => {
      if (data[expense.category]) {
        data[expense.category] += expense.amount
      } else {
        data[expense.category] = expense.amount
      }
    })
    return Object.keys(data).map(key => ({ name: key, value: data[key] }))
  }, [expenses])

  const [showHistory, setShowHistory] = useState(false)

  // Group expenses by Year -> Month
  const groupedExpenses = useMemo(() => {
    const grouped = {}
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = { total: 0, items: [] };

      grouped[year][month].items.push(expense);
      grouped[year][month].total += expense.amount;
    });
    return grouped;
  }, [expenses]);


  const generateInsight = () => {
    setAnalyzing(true);
    setTimeout(() => {
      if (expenses.length === 0) {
        setAiInsight("Please add some expenses first so I can analyze your habits!");
        setAnalyzing(false);
        return;
      }

      const remaining = budget - totalSpent;
      const percentageUsed = ((totalSpent / budget) * 100).toFixed(0);

      // Find highest category
      const sortedCats = [...categoryData].sort((a, b) => b.value - a.value);
      const highestCategory = sortedCats[0];

      let msg = "";
      if (totalSpent > budget) {
        msg = `🚨 Alert: You've exceeded your budget by ₹${Math.abs(remaining).toFixed(0)}! Your biggest expense was ${highestCategory?.name} (₹${highestCategory?.value}).`;
      } else if (percentageUsed > 80) {
        msg = `⚠️ Careful! You've used ${percentageUsed}% of your budget. You only have ₹${remaining.toFixed(0)} left for the month.`;
      } else {
        msg = `✅ You're doing great! You've used ${percentageUsed}% of your budget. You have ₹${remaining.toFixed(0)} safely remaining.`;
      }

      setAiInsight(msg);
      setAnalyzing(false);
    }, 1500);
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(newExpense => {
        setExpenses([...expenses, newExpense])
        setFormData({ ...formData, description: '', amount: '' })
      })
  }



  /* Export to CSV Logic */
  const exportToCSV = () => {
    // 1. Create CSV header and rows
    const headers = ["Date,Description,Category,Amount"];
    const rows = expenses.map(e =>
      `${e.date},"${e.description.replace(/"/g, '""')}",${e.category},${e.amount}`
    );

    // 2. Combine formatted data
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers, ...rows].join("\n");

    // 3. Create download link and trigger click
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  const handleDelete = (id) => {
    fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE' })
      .then(() => {
        setExpenses(expenses.filter(exp => exp.id !== id))
      })
  }

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Expense Tracker Pro
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Smart Financial Management</p>
      </header>

      {/* Budget Input Area */}
      <div className="glass-panel" style={{
        maxWidth: '600px',
        margin: '0 auto 3rem auto',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>💰 Monthly Budget: </span>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '10px', color: 'white' }}>₹</span>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
            className="input-field"
            style={{ width: '120px', margin: 0, paddingLeft: '25px', marginBottom: 0 }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

        {/* Left Column: Form + Chart + AI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Add Expense Form */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3>Add New Expense</h3>
            <form onSubmit={handleSubmit}>
              {/* 1. Amount */}
              <input
                className="input-field"
                type="number"
                placeholder="Amount (₹)"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                required
              />

              {/* 2. Category */}
              <select
                className="input-field"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="" disabled>Select Category</option>
                <option>Food</option>
                <option>Transport</option>
                <option>Utilities</option>
                <option>Entertainment</option>
                <option>Other</option>
              </select>

              {/* 3. Specify Other (Conditional) */}


              {/* 4. Description */}
              <input
                className="input-field"
                placeholder="Description (e.g. Starbucks)"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />

              {/* 5. Date */}
              <input
                className="input-field"
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Add Transaction
              </button>
            </form>
          </div>

          {/* Spending Chart */}
          <div className="glass-panel" style={{ padding: '2rem', minHeight: '300px' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Where your money goes</h3>
            {categoryData.length > 0 ? (
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Add expenses to see analysis</p>
            )}
          </div>

          {/* AI Insights Section */}
          <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>✨ AI Financial Advisor</h3>
              <button
                onClick={generateInsight}
                className="btn-primary"
                disabled={analyzing}
                style={{ background: 'linear-gradient(to right, #818cf8, #c084fc)' }}
              >
                {analyzing ? 'Analyzing...' : 'Analyze Habits'}
              </button>
            </div>

            {aiInsight && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '4px solid #c084fc',
                animation: 'fadeIn 0.5s ease'
              }}>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{aiInsight}</p>
              </div>
            )}
            {!aiInsight && !analyzing && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tap the button to get personalized saving advice based on your budget.</p>}
          </div>

        </div>

        {/* Expense List and Stats */}
        <div>
          {/* ... Stats ... */}

          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem 1rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0 }}>{showHistory ? 'Expense History' : 'Recent Expenses'}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={exportToCSV} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  ⬇️ Export CSV
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  {showHistory ? 'View Recent' : '📜 View History'}
                </button>
              </div>
            </div>
            {loading ? <p style={{ textAlign: 'center', padding: '1rem' }}>Loading...</p> :
              expenses.length === 0 ? <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No expenses yet.</p> :

                !showHistory ? (
                  // NORMAL VIEW
                  expenses.slice().reverse().map(expense => (
                    <div key={expense.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{expense.description}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {expense.category} • {expense.date}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>₹{expense.amount}</span>
                        <button className="delete-btn" onClick={() => handleDelete(expense.id)}>×</button>
                      </div>
                    </div>
                  ))
                ) : (
                  // HISTORY VIEW (Show edit/delete here too?)
                  Object.keys(groupedExpenses).sort((a, b) => b - a).map(year => (
                    <div key={year} style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ borderBottom: '2px solid #6366f1', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#c7d2fe' }}>{year}</h3>
                      {Object.keys(groupedExpenses[year]).sort((a, b) => b - a).map(monthIndex => {
                        const monthData = groupedExpenses[year][monthIndex];
                        const monthName = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });
                        return (
                          <div key={monthIndex} style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                              <span>{monthName}</span>
                              <span>Total: ₹{monthData.total.toFixed(2)}</span>
                            </div>
                            {monthData.items.map(expense => (
                              <div key={expense.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', alignItems: 'center' }}>
                                <div>
                                  <span>{expense.description} ({expense.category})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>₹{expense.amount}</span>
                                  <button className="delete-btn" style={{ fontSize: '1.2rem', lineHeight: '1' }} onClick={() => handleDelete(expense.id)}>×</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ))
                )
            }
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
