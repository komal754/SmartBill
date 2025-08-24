
// import CategoryProgressSummary from '../components/CategoryProgressSummary';
// import BudgetSettings from '../components/BudgetSettings';
// import { FaRupeeSign, FaCalendarAlt, FaWallet } from 'react-icons/fa';
// import { motion } from 'framer-motion';
// import { useState, useEffect } from 'react';

// export default function Dashboard() {
//   const [totalSpend, setTotalSpend] = useState(0);
//   const [thisMonthSpend, setThisMonthSpend] = useState(0);
//   const [budget, setBudget] = useState(() => {
//     const stored = localStorage.getItem('userBudget');
//     return stored ? Number(stored) : 10000;
//   });

//   useEffect(() => {
//     async function fetchSummary() {
//       const token = localStorage.getItem('token');
//       // Fetch all expenses
//       const res = await fetch('/api/expenses', {
//         headers: { 'Authorization': token ? `Bearer ${token}` : undefined }
//       });
//       const arr = await res.json();
//       // Total spend
//       const total = arr.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
//       setTotalSpend(total);
//       // This month
//       const now = new Date();
//       const month = now.getMonth() + 1;
//       const year = now.getFullYear();
//       const thisMonth = arr.filter(e => {
//         if (!e.date) return false;
//         const [y, m] = e.date.split('-');
//         return Number(y) === year && Number(m) === month;
//       });
//       const thisMonthTotal = thisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);




//       export default function Dashboard() {
//         const [totalSpend, setTotalSpend] = useState(0);
//         const [thisMonthSpend, setThisMonthSpend] = useState(0);
//         const [budget, setBudget] = useState(() => {
//           const stored = localStorage.getItem('userBudget');
//           return stored ? Number(stored) : 10000;
//         });

//         useEffect(() => {
//           async function fetchSummary() {
//             const token = localStorage.getItem('token');
//             // Fetch all expenses
//             const res = await fetch('/api/expenses', {
//               headers: { 'Authorization': token ? `Bearer ${token}` : undefined }
//             });
//             const arr = await res.json();
//             // Total spend
//             const total = arr.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
//             setTotalSpend(total);
//             // This month
//             const now = new Date();
//             const month = now.getMonth() + 1;
//             const year = now.getFullYear();
//             const thisMonth = arr.filter(e => {
//               if (!e.date) return false;
//               const [y, m] = e.date.split('-');
//               return Number(y) === year && Number(m) === month;
//             });
//             const thisMonthTotal = thisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
//             setThisMonthSpend(thisMonthTotal);
//           }
//           fetchSummary();
//         }, []);

//         return (
//           <div className="w-full max-w-3xl mx-auto mt-8 px-2">
//             <motion.h1
//               className="text-4xl font-extrabold mb-8 text-center text-gray-800"
//               initial={{ opacity: 0, y: -30 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.7 }}
//             >
//               SmartBill Dashboard
//             </motion.h1>
//             <BudgetSettings budget={budget} setBudget={setBudget} />
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
//               {[
//                 {
//                   label: 'Total Spend',
//                   value: `₹${totalSpend}`,
//                   icon: <FaRupeeSign className="text-blue-400 text-3xl mb-2 animate-bounce" />, // animated icon
//                   color: 'from-blue-100 to-blue-50',
//                 },
//                 {
//                   label: 'This Month',
//                   value: `₹${thisMonthSpend}`,
//                   icon: <FaCalendarAlt className="text-green-400 text-3xl mb-2 animate-pulse" />, // animated icon
//                   color: 'from-green-100 to-green-50',
//                 },
//                 {
//                   label: 'Budget Remaining',
//                   value: `₹${Math.max(budget - thisMonthSpend, 0)}`,
//                   icon: <FaWallet className="text-yellow-400 text-3xl mb-2 animate-spin-slow" />, // animated icon
//                   color: 'from-yellow-100 to-yellow-50',
//                 }
//               ].map((item, idx) => {
//                 return (
//                   <motion.div
//                     key={item.label}
//                     className={`bg-gradient-to-br ${item.color} shadow-lg rounded-2xl p-6 flex flex-col items-center hover:scale-105 transition-transform duration-300`}
//                     initial={{ opacity: 0, y: 30 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 0.1 * idx, duration: 0.6 }}
//                     whileHover={{ scale: 1.07 }}
//                   >
//                     {item.icon}
//                     <div className="text-gray-500 mb-1 font-medium">{item.label}</div>
//                     <div className="text-2xl font-bold text-blue-700">{item.value}</div>
//                   </motion.div>
//                 );
//               })}
//             </div>
//             <motion.div
//               initial={{ opacity: 0, scale: 0.95 }}
//               animate={{ opacity: 1, scale: 1 }}
//               transition={{ duration: 0.7, delay: 0.2 }}
//             >
//               <CategoryProgressSummary />
//             </motion.div>
//           </div>
//         );
//       }
import CategoryProgressSummary from '../components/CategoryProgressSummary';
import BudgetSettings from '../components/BudgetSettings';
import { FaRupeeSign, FaCalendarAlt, FaWallet } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRefresh } from '../context/RefreshContext';

export default function Dashboard() {
  const [totalSpend, setTotalSpend] = useState(0);
  const [thisMonthSpend, setThisMonthSpend] = useState(0);
  const [budget, setBudget] = useState(() => {
    const stored = localStorage.getItem('userBudget');
    return stored ? Number(stored) : 10000;
  });
  const { refreshKey } = useRefresh();

  useEffect(() => {
    async function fetchSummary() {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/expenses', {
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined }
      });
      const arr = await res.json();
      const total = arr.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      setTotalSpend(total);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const thisMonth = arr.filter(e => {
        if (!e.date) return false;
        const [y, m] = e.date.split('-');
        return Number(y) === year && Number(m) === month;
      });
      const thisMonthTotal = thisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      setThisMonthSpend(thisMonthTotal);
    }
    fetchSummary();
  }, [refreshKey]);

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 px-2">
      <motion.h1
        className="text-4xl font-extrabold mb-8 text-center text-gray-800"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        SmartBill Dashboard
      </motion.h1>
      <BudgetSettings budget={budget} setBudget={setBudget} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            label: 'Total Spend',
            value: `₹${totalSpend}`,
            icon: <FaRupeeSign className="text-blue-400 text-3xl mb-2 animate-bounce" />,
            color: 'from-blue-100 to-blue-50',
          },
          {
            label: 'This Month',
            value: `₹${thisMonthSpend}`,
            icon: <FaCalendarAlt className="text-green-400 text-3xl mb-2 animate-pulse" />,
            color: 'from-green-100 to-green-50',
          },
          {
            label: 'Budget Remaining',
            value: `₹${Math.max(budget - thisMonthSpend, 0)}`,
            icon: <FaWallet className="text-yellow-400 text-3xl mb-2 animate-spin-slow" />,
            color: 'from-yellow-100 to-yellow-50',
          }
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            className={`bg-gradient-to-br ${item.color} shadow-lg rounded-2xl p-6 flex flex-col items-center hover:scale-105 transition-transform duration-300`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, duration: 0.6 }}
            whileHover={{ scale: 1.07 }}
          >
            {item.icon}
            <div className="text-gray-500 mb-1 font-medium">{item.label}</div>
            <div className="text-2xl font-bold text-blue-700">{item.value}</div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <CategoryProgressSummary />
      </motion.div>
    </div>
  );
}
