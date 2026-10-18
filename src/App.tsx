import React, { useState, useEffect, useMemo, useRef } from 'react';
// --- LOCAL BROWSER STORAGE ADAPTER (Replaces Firebase Imports) ---
(globalThis as any).__firebase_config = '{}';
(globalThis as any).__app_id = 'aurelia-finance-tracker';
(globalThis as any).__initial_auth_token = '';

const initializeApp = (_cfg?: any) => ({});
const getAuth = (_app?: any) => ({ currentUser: { uid: 'local-user' } });
const signInAnonymously = async (_auth?: any) => ({
  user: { uid: 'local-user' },
});
const signInWithCustomToken = async (_auth?: any, _token?: any) => ({
  user: { uid: 'local-user' },
});
const signOut = async (_auth?: any) => {};
const onAuthStateChanged = (_auth: any, cb: any) => {
  setTimeout(() => cb({ uid: 'local-user', isAnonymous: true }), 0);
  return () => {};
};

const getFirestore = (_app?: any) => ({});
const _listeners: Record<string, Set<() => void>> = {};
const _notify = (colPath: string) => _listeners[colPath]?.forEach((fn) => fn());
const _getStore = (colPath: string): Record<string, any> => {
  try {
    return JSON.parse(localStorage.getItem(colPath) || '{}');
  } catch {
    return {};
  }
};
const _saveStore = (colPath: string, data: Record<string, any>) => {
  try {
    localStorage.setItem(colPath, JSON.stringify(data));
  } catch {}
  _notify(colPath);
};

const collection = (_db: any, ...segments: string[]) => ({
  type: 'collection',
  path: segments.join('/'),
});
const doc = (_dbOrCol: any, ...segments: string[]) => {
  if (_dbOrCol?.type === 'collection') {
    const id = segments[0] || Math.random().toString(36).slice(2);
    return {
      type: 'doc',
      colPath: _dbOrCol.path,
      id,
      path: `${_dbOrCol.path}/${id}`,
    };
  }
  const id = segments[segments.length - 1];
  const colPath = segments.slice(0, -1).join('/');
  return { type: 'doc', colPath, id, path: segments.join('/') };
};
const setDoc = async (docRef: any, data: any, options?: any) => {
  const store = _getStore(docRef.colPath);
  store[docRef.id] = options?.merge
    ? { ...(store[docRef.id] || {}), ...data }
    : data;
  _saveStore(docRef.colPath, store);
};
const addDoc = async (colRef: any, data: any) => {
  const id = Math.random().toString(36).slice(2);
  await setDoc({ colPath: colRef.path, id }, data);
  return { id };
};
const updateDoc = async (docRef: any, data: any) =>
  setDoc(docRef, data, { merge: true });
const deleteDoc = async (docRef: any) => {
  const store = _getStore(docRef.colPath);
  delete store[docRef.id];
  _saveStore(docRef.colPath, store);
};
const onSnapshot = (ref: any, onNext: any, _onError?: any) => {
  const colPath = ref.type === 'collection' ? ref.path : ref.colPath;
  const emit = () => {
    const store = _getStore(colPath);
    if (ref.type === 'collection') {
      const docs = Object.entries(store).map(([id, val]) => ({
        id,
        data: () => val,
        exists: () => true,
      }));
      onNext({
        docs,
        empty: docs.length === 0,
        forEach: (fn: any) => docs.forEach(fn),
      });
    } else {
      const val = store[ref.id];
      onNext({ id: ref.id, exists: () => val !== undefined, data: () => val });
    }
  };
  if (!_listeners[colPath]) _listeners[colPath] = new Set();
  _listeners[colPath].add(emit);
  setTimeout(emit, 0);
  return () => _listeners[colPath]?.delete(emit);
};
// --- END LOCAL BROWSER STORAGE ADAPTER ---
import {
  PlusCircle,
  MinusCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Award,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  RotateCcw,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  LogOut,
  LogIn,
  ShieldCheck,
  Target,
  Home,
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  HeartPulse,
  Briefcase,
  Landmark,
  Sparkles,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// 1. FIREBASE INITIALIZATION (OUTSIDE COMPONENT)
// ---------------------------------------------------------------------------
const firebaseConfig =
  typeof __firebase_config !== 'undefined' && __firebase_config
    ? JSON.parse(__firebase_config)
    : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ---------------------------------------------------------------------------
// 2. CURRENCIES & CATEGORIES (GREEN FOR INCOME, REDDISH FOR EXPENSE)
// ---------------------------------------------------------------------------
const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', locale: 'en-US' },
  BDT: { code: 'BDT', symbol: '৳', label: 'BDT (৳)', locale: 'en-IN' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', locale: 'en-GB' },
};

const CATEGORIES = {
  // Expense Categories (Reddish family)
  housing: {
    id: 'housing',
    name: 'Housing & Rent',
    type: 'expense',
    icon: Home,
    defaultBudget: 1500,
  },
  groceries: {
    id: 'groceries',
    name: 'Groceries & Market',
    type: 'expense',
    icon: ShoppingBag,
    defaultBudget: 500,
  },
  dining: {
    id: 'dining',
    name: 'Dining & Tea/Coffee',
    type: 'expense',
    icon: Utensils,
    defaultBudget: 350,
  },
  transport: {
    id: 'transport',
    name: 'Transport & Fuel',
    type: 'expense',
    icon: Car,
    defaultBudget: 250,
  },
  utilities: {
    id: 'utilities',
    name: 'Utilities & Bills',
    type: 'expense',
    icon: Zap,
    defaultBudget: 220,
  },
  health: {
    id: 'health',
    name: 'Healthcare & Personal',
    type: 'expense',
    icon: HeartPulse,
    defaultBudget: 300,
  },
  // Income Categories (Green family)
  salary: {
    id: 'salary',
    name: 'Monthly Salary',
    type: 'income',
    icon: Briefcase,
  },
  freelance: {
    id: 'freelance',
    name: 'Freelance & Consulting',
    type: 'income',
    icon: Sparkles,
  },
  investments: {
    id: 'investments',
    name: 'Dividends & Profit',
    type: 'income',
    icon: Landmark,
  },
  other_income: {
    id: 'other_income',
    name: 'Bonus & Other Income',
    type: 'income',
    icon: Wallet,
  },
};

// Quick 1-Click Chips for fast user-friendly entry
const QUICK_CHIPS = {
  expense: [
    {
      label: 'Groceries',
      category: 'groceries',
      amount: 45,
      note: 'Fresh groceries & essentials',
    },
    {
      label: 'Dining / Meal',
      category: 'dining',
      amount: 18,
      note: 'Lunch / evening meal',
    },
    {
      label: 'Transit / Fuel',
      category: 'transport',
      amount: 15,
      note: 'Daily commute & fuel',
    },
    {
      label: 'Utility Bill',
      category: 'utilities',
      amount: 85,
      note: 'Electricity & internet bill',
    },
    {
      label: 'Pharmacy / Care',
      category: 'health',
      amount: 30,
      note: 'Health & personal care',
    },
  ],
  income: [
    {
      label: 'Monthly Salary',
      category: 'salary',
      amount: 4200,
      note: 'Primary monthly salary',
    },
    {
      label: 'Freelance Payout',
      category: 'freelance',
      amount: 650,
      note: 'Client project milestone',
    },
    {
      label: 'Savings Dividend',
      category: 'investments',
      amount: 180,
      note: 'Quarterly investment return',
    },
    {
      label: 'Cash Bonus',
      category: 'other_income',
      amount: 250,
      note: 'Performance & festival bonus',
    },
  ],
};

// Formal Financial Levels
const FINANCIAL_LEVELS = [
  { level: 1, title: 'Foundation Member', minPoints: 0, maxPoints: 300 },
  { level: 2, title: 'Disciplined Recorder', minPoints: 300, maxPoints: 650 },
  { level: 3, title: 'Prudent Steward', minPoints: 650, maxPoints: 1000 },
  { level: 4, title: 'Surplus Architect', minPoints: 1000, maxPoints: 1500 },
  { level: 5, title: 'Sovereign Capitalist', minPoints: 1500, maxPoints: 3000 },
];

// Default Sample Data for October 2026
const SAMPLE_TRANSACTIONS = [
  {
    id: 'sample_1',
    date: '2026-10-01',
    type: 'income',
    category: 'salary',
    amount: 4800,
    note: 'October Monthly Salary Credit',
  },
  {
    id: 'sample_2',
    date: '2026-10-01',
    type: 'expense',
    category: 'housing',
    amount: 1350,
    note: 'Monthly Apartment Rent & Maintenance',
  },
  {
    id: 'sample_3',
    date: '2026-10-03',
    type: 'expense',
    category: 'groceries',
    amount: 115,
    note: 'Weekly Supermarket & Fresh Produce',
  },
  {
    id: 'sample_4',
    date: '2026-10-05',
    type: 'expense',
    category: 'utilities',
    amount: 130,
    note: 'Electricity, Water & Fiber Internet',
  },
  {
    id: 'sample_5',
    date: '2026-10-07',
    type: 'expense',
    category: 'dining',
    amount: 42,
    note: 'Family Dinner Outing',
  },
  {
    id: 'sample_6',
    date: '2026-10-08',
    type: 'income',
    category: 'freelance',
    amount: 750,
    note: 'Advisory & Consulting Retainer',
  },
  {
    id: 'sample_7',
    date: '2026-10-10',
    type: 'expense',
    category: 'transport',
    amount: 55,
    note: 'Fuel Refill & Highway Toll',
  },
  {
    id: 'sample_8',
    date: '2026-10-12',
    type: 'expense',
    category: 'groceries',
    amount: 92,
    note: 'Market Staples & Household Supplies',
  },
  {
    id: 'sample_9',
    date: '2026-10-14',
    type: 'income',
    category: 'investments',
    amount: 220,
    note: 'Treasury & Dividend Payout',
  },
  {
    id: 'sample_10',
    date: '2026-10-15',
    type: 'expense',
    category: 'health',
    amount: 65,
    note: 'Routine Checkup & Vitamins',
  },
  {
    id: 'sample_11',
    date: '2026-10-17',
    type: 'expense',
    category: 'dining',
    amount: 28,
    note: 'Coffee & Afternoon Refreshments',
  },
  {
    id: 'sample_12',
    date: '2026-10-18',
    type: 'expense',
    category: 'transport',
    amount: 22,
    note: 'City Commute & Metro Pass',
  },
];

const DEFAULT_BUDGETS = {
  housing: 1500,
  groceries: 500,
  dining: 350,
  transport: 250,
  utilities: 220,
  health: 300,
};

// ---------------------------------------------------------------------------
// 3. FORMATTING & DATE HELPERS
// ---------------------------------------------------------------------------
function formatCurrency(val, currencyCode = 'USD', compact = false) {
  const cfg = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const num = Number(val) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (compact) {
    if (abs >= 1_000_000)
      return `${sign}${cfg.symbol}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000)
      return `${sign}${cfg.symbol}${(abs / 1_000).toFixed(1)}k`;
  }

  const hasFraction = Math.round(abs * 100) % 100 !== 0;
  return `${sign}${cfg.symbol}${abs.toLocaleString(cfg.locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function getDaysInMonth(year, monthZeroIndexed) {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

function getStartDayOfWeek(year, monthZeroIndexed) {
  return new Date(year, monthZeroIndexed, 1).getDay();
}

function formatReadableDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// 4. MAIN APPLICATION COMPONENT
// ---------------------------------------------------------------------------
export default function PersonalWealthTracker() {
  // Authentication & Cloud Sync State
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [memberName, setMemberName] = useState('Executive Member');
  const [loginInputName, setLoginInputName] = useState('Executive Member');

  // Core Financial State (Synced with Firestore)
  const [transactions, setTransactions] = useState(SAMPLE_TRANSACTIONS);
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState(1800);
  const [currency, setCurrency] = useState('USD');
  const [hasLoadedCloud, setHasLoadedCloud] = useState(false);

  // Active Calendar & Date Selection (Default: October 18, 2026)
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedDate, setSelectedDate] = useState('2026-10-18');

  // Direct Entry Form State (Prominent Top Section)
  const [entryType, setEntryType] = useState('expense'); // 'expense' (Reddish) | 'income' (Green)
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('groceries');
  const [entryDate, setEntryDate] = useState('2026-10-18');
  const [entryNote, setEntryNote] = useState('');
  const [editingTxId, setEditingTxId] = useState(null);

  // Inline Editing States for Savings Goal & Budgets
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('1800');
  const [editingBudgetCat, setEditingBudgetCat] = useState(null);
  const [budgetInputVal, setBudgetInputVal] = useState('');

  // Ledger Search & Filter State
  const [ledgerFilter, setLedgerFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  const entryAmountInputRef = useRef(null);

  const showNotification = (title, type = 'green') => {
    setStatusBanner({ id: Date.now(), title, type });
  };

  useEffect(() => {
    if (!statusBanner) return;
    const t = setTimeout(() => setStatusBanner(null), 3200);
    return () => clearTimeout(t);
  }, [statusBanner]);

  // Keep Entry Form Date synced when user clicks a day on the Calendar
  const handleSelectCalendarDate = (dateStr) => {
    setSelectedDate(dateStr);
    setEntryDate(dateStr);
  };

  // Switch Entry Mode (Expense <-> Income) and set appropriate default category
  const handleSwitchEntryType = (newType) => {
    setEntryType(newType);
    if (newType === 'expense') {
      if (CATEGORIES[entryCategory]?.type !== 'expense') {
        setEntryCategory('groceries');
      }
    } else {
      if (CATEGORIES[entryCategory]?.type !== 'income') {
        setEntryCategory('salary');
      }
    }
  };

  // -------------------------------------------------------------------------
  // FIREBASE AUTHENTICATION (RULE 3)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Authentication initialization notice:', err);
        setAuthReady(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // FIRESTORE REAL-TIME SYNC (RULE 1 & RULE 2)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const txColRef = collection(
      db,
      'artifacts',
      appId,
      'users',
      user.uid,
      'transactions'
    );
    const settingsDocRef = doc(
      db,
      'artifacts',
      appId,
      'users',
      user.uid,
      'settings',
      'preferences'
    );

    const unsubTx = onSnapshot(
      txColRef,
      (snapshot) => {
        if (snapshot.empty && !hasLoadedCloud) {
          // Seed initial sample transactions so the calendar is immediately rich
          SAMPLE_TRANSACTIONS.forEach((item) => {
            const dRef = doc(
              db,
              'artifacts',
              appId,
              'users',
              user.uid,
              'transactions',
              item.id
            );
            setDoc(dRef, item).catch(() => {});
          });
          setTransactions(SAMPLE_TRANSACTIONS);
        } else if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTransactions(loaded);
        }
        setHasLoadedCloud(true);
      },
      (err) => {
        console.error('Firestore transactions listener notice:', err);
      }
    );

    const unsubSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.budgets) setBudgets(data.budgets);
          if (data.monthlySavingsGoal)
            setMonthlySavingsGoal(Number(data.monthlySavingsGoal));
          if (data.currency) setCurrency(data.currency);
          if (data.memberName) setMemberName(data.memberName);
        }
      },
      (err) => {
        console.error('Firestore settings listener notice:', err);
      }
    );

    return () => {
      unsubTx();
      unsubSettings();
    };
  }, [user]);

  // Save user preferences to Firestore
  const savePreferencesToCloud = async (nextPrefs) => {
    if (!user) return;
    try {
      const settingsDocRef = doc(
        db,
        'artifacts',
        appId,
        'users',
        user.uid,
        'settings',
        'preferences'
      );
      await setDoc(
        settingsDocRef,
        {
          budgets,
          monthlySavingsGoal,
          currency,
          memberName,
          ...nextPrefs,
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Failed saving preferences:', e);
    }
  };

  // -------------------------------------------------------------------------
  // ADD / EDIT / DELETE TRANSACTION HANDLERS
  // -------------------------------------------------------------------------
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(entryAmount);
    if (Number.isNaN(numAmount) || numAmount <= 0) return;

    const recordId = editingTxId || `tx_${Date.now()}`;
    const newRecord = {
      id: recordId,
      date: entryDate || selectedDate,
      type: entryType,
      category: entryCategory,
      amount: numAmount,
      note:
        entryNote.trim() ||
        CATEGORIES[entryCategory]?.name ||
        'Financial Entry',
    };

    // Optimistic state update
    setTransactions((prev) => {
      const filtered = prev.filter((t) => t.id !== recordId);
      return [newRecord, ...filtered];
    });

    // Sync selected calendar date to the date of the entry
    setSelectedDate(newRecord.date);
    if (newRecord.date.slice(0, 7) !== selectedMonth) {
      setSelectedMonth(newRecord.date.slice(0, 7));
    }

    // Reset form fields
    setEntryAmount('');
    setEntryNote('');
    setEditingTxId(null);

    showNotification(
      `${
        entryType === 'income' ? 'Income (+)' : 'Expense (-)'
      } Recorded: ${formatCurrency(numAmount, currency)} on ${newRecord.date}`,
      entryType === 'income' ? 'green' : 'red'
    );

    if (user) {
      try {
        const docRef = doc(
          db,
          'artifacts',
          appId,
          'users',
          user.uid,
          'transactions',
          recordId
        );
        await setDoc(docRef, newRecord);
      } catch (err) {
        console.error('Error saving transaction:', err);
      }
    }
  };

  const handleQuickChipEntry = async (chip, type) => {
    const recordId = `tx_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 5)}`;
    const newRecord = {
      id: recordId,
      date: selectedDate,
      type,
      category: chip.category,
      amount: chip.amount,
      note: chip.note,
    };

    setTransactions((prev) => [newRecord, ...prev]);
    showNotification(
      `Quick-Logged ${chip.label}: ${
        type === 'income' ? '+' : '-'
      }${formatCurrency(chip.amount, currency)} (${selectedDate})`,
      type === 'income' ? 'green' : 'red'
    );

    if (user) {
      try {
        const docRef = doc(
          db,
          'artifacts',
          appId,
          'users',
          user.uid,
          'transactions',
          recordId
        );
        await setDoc(docRef, newRecord);
      } catch (err) {
        console.error('Error saving quick chip:', err);
      }
    }
  };

  const handleStartEdit = (tx) => {
    setEditingTxId(tx.id);
    setEntryType(tx.type);
    setEntryAmount(String(tx.amount));
    setEntryCategory(tx.category);
    setEntryDate(tx.date);
    setEntryNote(tx.note || '');
    setSelectedDate(tx.date);
    if (entryAmountInputRef.current) {
      entryAmountInputRef.current.focus();
    }
  };

  const handleDeleteEntry = async (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showNotification('Transaction entry removed from ledger', 'red');
    if (user) {
      try {
        const docRef = doc(
          db,
          'artifacts',
          appId,
          'users',
          user.uid,
          'transactions',
          id
        );
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Error deleting transaction:', err);
      }
    }
  };

  const handleResetSampleData = async () => {
    setTransactions(SAMPLE_TRANSACTIONS);
    setBudgets(DEFAULT_BUDGETS);
    setMonthlySavingsGoal(1800);
    setSelectedMonth('2026-10');
    setSelectedDate('2026-10-18');
    setEntryDate('2026-10-18');
    setConfirmReset(false);
    showNotification('October 2026 sample ledger restored', 'green');

    if (user) {
      try {
        SAMPLE_TRANSACTIONS.forEach((item) => {
          const dRef = doc(
            db,
            'artifacts',
            appId,
            'users',
            user.uid,
            'transactions',
            item.id
          );
          setDoc(dRef, item).catch(() => {});
        });
        await savePreferencesToCloud({
          budgets: DEFAULT_BUDGETS,
          monthlySavingsGoal: 1800,
        });
      } catch (err) {
        console.error('Error resetting sample data:', err);
      }
    }
  };

  // -------------------------------------------------------------------------
  // MONTHLY & DAILY CALENDAR SUMMARY CALCULATIONS
  // -------------------------------------------------------------------------
  const [yearNum, monthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m];
  }, [selectedMonth]);

  const daysInMonth = useMemo(
    () => getDaysInMonth(yearNum, monthNum - 1),
    [yearNum, monthNum]
  );

  const startDayOfWeek = useMemo(
    () => getStartDayOfWeek(yearNum, monthNum - 1),
    [yearNum, monthNum]
  );

  // Elapsed days in current month (Oct 18, 2026 reference)
  const elapsedDaysCount = useMemo(() => {
    if (selectedMonth === '2026-10') return 18;
    return daysInMonth;
  }, [selectedMonth, daysInMonth]);

  const monthTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.date && t.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedMonth]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    const categoryTotals = {};
    Object.keys(CATEGORIES).forEach((k) => {
      categoryTotals[k] = 0;
    });

    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      dailyMap[dateStr] = {
        day: d,
        date: dateStr,
        income: 0,
        expense: 0,
        net: 0,
        items: [],
      };
    }

    monthTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }

      if (categoryTotals[tx.category] !== undefined) {
        categoryTotals[tx.category] += amt;
      }

      if (dailyMap[tx.date]) {
        dailyMap[tx.date].items.push(tx);
        if (tx.type === 'income') dailyMap[tx.date].income += amt;
        else dailyMap[tx.date].expense += amt;
        dailyMap[tx.date].net =
          dailyMap[tx.date].income - dailyMap[tx.date].expense;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRatePct =
      totalIncome > 0
        ? Math.max(0, Math.min(100, (netSavings / totalIncome) * 100))
        : 0;
    const savingsGoalProgressPct =
      monthlySavingsGoal > 0
        ? Math.max(
            0,
            Math.min(100, (Math.max(0, netSavings) / monthlySavingsGoal) * 100)
          )
        : 0;

    const dailyList = Object.values(dailyMap);
    const noSpendDays = dailyList.filter(
      (d) => d.day <= elapsedDaysCount && d.expense === 0
    ).length;

    let highestSpendDay = null;
    dailyList.forEach((d) => {
      if (
        d.expense > 0 &&
        (!highestSpendDay || d.expense > highestSpendDay.expense)
      ) {
        highestSpendDay = d;
      }
    });

    const dailyAverageExpense = totalExpense / Math.max(1, elapsedDaysCount);
    const totalBudgetAllocation = Object.values(budgets).reduce(
      (acc, v) => acc + (Number(v) || 0),
      0
    );

    const selectedDayData = dailyMap[selectedDate] || {
      day: 1,
      date: selectedDate,
      income: 0,
      expense: 0,
      net: 0,
      items: [],
    };

    // Financial Level & Milestones calculation
    const categoriesWithinBudget = Object.keys(budgets).filter(
      (catKey) => (categoryTotals[catKey] || 0) <= (budgets[catKey] || 0)
    ).length;

    const points =
      transactions.length * 25 +
      noSpendDays * 40 +
      Math.round(savingsRatePct * 12) +
      categoriesWithinBudget * 60;

    let currentLevel = FINANCIAL_LEVELS[0];
    for (const lvl of FINANCIAL_LEVELS) {
      if (points >= lvl.minPoints) currentLevel = lvl;
    }
    const nextLevel =
      FINANCIAL_LEVELS.find((l) => l.level === currentLevel.level + 1) || null;
    const levelProgress = nextLevel
      ? Math.min(
          100,
          Math.round(
            ((points - currentLevel.minPoints) /
              (nextLevel.minPoints - currentLevel.minPoints)) *
              100
          )
        )
      : 100;

    const milestones = [
      {
        id: 'm_nospend',
        label: '5+ No-Spend Days',
        detail: `${noSpendDays} / 5 days`,
        achieved: noSpendDays >= 5,
      },
      {
        id: 'm_savings',
        label: '20%+ Savings Rate',
        detail: `${savingsRatePct.toFixed(0)}% rate`,
        achieved: savingsRatePct >= 20,
      },
      {
        id: 'm_budget',
        label: 'All Budgets Intact',
        detail: `${categoriesWithinBudget} / ${
          Object.keys(budgets).length
        } categories`,
        achieved:
          categoriesWithinBudget === Object.keys(budgets).length &&
          totalExpense > 0,
      },
      {
        id: 'm_goal',
        label: 'Monthly Goal Met',
        detail: `${Math.round(savingsGoalProgressPct)}% of goal`,
        achieved: netSavings >= monthlySavingsGoal && monthlySavingsGoal > 0,
      },
    ];

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRatePct,
      savingsGoalProgressPct,
      dailyList,
      noSpendDays,
      highestSpendDay,
      dailyAverageExpense,
      totalBudgetAllocation,
      categoryTotals,
      selectedDayData,
      points,
      currentLevel,
      nextLevel,
      levelProgress,
      milestones,
    };
  }, [
    monthTransactions,
    daysInMonth,
    selectedMonth,
    elapsedDaysCount,
    budgets,
    monthlySavingsGoal,
    selectedDate,
    transactions.length,
  ]);

  // Filtered Ledger Transactions
  const filteredLedger = useMemo(() => {
    return monthTransactions.filter((tx) => {
      if (ledgerFilter !== 'all' && tx.type !== ledgerFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const catName = (CATEGORIES[tx.category]?.name || '').toLowerCase();
        const note = (tx.note || '').toLowerCase();
        if (
          !catName.includes(q) &&
          !note.includes(q) &&
          !String(tx.amount).includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [monthTransactions, ledgerFilter, searchQuery]);

  // Month Navigation
  const changeMonth = (delta) => {
    const d = new Date(yearNum, monthNum - 1 + delta, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    setSelectedMonth(nextYm);
    const defaultDay = nextYm === '2026-10' ? '2026-10-18' : `${nextYm}-01`;
    setSelectedDate(defaultDay);
    setEntryDate(defaultDay);
  };

  const monthHeading = useMemo(() => {
    const d = new Date(yearNum, monthNum - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [yearNum, monthNum]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = monthTransactions.map((t) => [
      t.date,
      t.type.toUpperCase(),
      CATEGORIES[t.category]?.name || t.category,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const ta = document.createElement('textarea');
    ta.value = csv;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showNotification('Monthly CSV Ledger copied to clipboard', 'green');
  };

  // Sign Out / Lock Session Handler
  const handleLockOrSignOut = async () => {
    setIsSessionLocked(true);
  };

  const handleUnlockSession = async (e) => {
    e.preventDefault();
    if (loginInputName.trim()) {
      setMemberName(loginInputName.trim());
      savePreferencesToCloud({ memberName: loginInputName.trim() });
    }
    if (!user) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error(err);
      }
    }
    setIsSessionLocked(false);
    showNotification('Welcome back. Ready to record your finances.', 'green');
  };

  // -------------------------------------------------------------------------
  // FORMAL SIGN-IN VIEW (WHEN USER SIGNS OUT / LOCKS LEDGER)
  // -------------------------------------------------------------------------
  if (isSessionLocked) {
    return (
      <div
        className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col justify-center items-center p-4"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-xl shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1
                className="text-xl font-bold text-stone-900"
                style={{ fontFamily: "'Merriweather', serif" }}
              >
                Veridian & Rose
              </h1>
              <p className="text-xs text-stone-500">
                Formal Personal Expense, Income & Calendar Ledger
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlockSession} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Account Holder Name
              </label>
              <input
                type="text"
                required
                value={loginInputName}
                onChange={(e) => setLoginInputName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
              <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Direct Entry on Sign-In</span>
              </div>
              <p>
                Upon entering, your Expense (Reddish) and Income (Green) entry
                console and Monthly Calendar Summary will open immediately.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In & Open Finance Entry</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // LOGGED-IN MAIN WORKSPACE
  // -------------------------------------------------------------------------
  const isExpenseMode = entryType === 'expense';

  return (
    <div
      className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-16 antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Load Formal Serif (Merriweather), Sans (Plus Jakarta Sans), and Tabular Mono (JetBrains Mono) */}
      <link
        href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Floating Notification Banner */}
      {statusBanner && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold transition-all ${
            statusBanner.type === 'green'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {statusBanner.type === 'green' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span>{statusBanner.title}</span>
          <button
            onClick={() => setStatusBanner(null)}
            className="ml-2 opacity-75 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================
          FORMAL HEADER BAR
         =================================================================== */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1
                  className="text-lg sm:text-xl font-bold tracking-tight text-stone-900"
                  style={{ fontFamily: "'Merriweather', serif" }}
                >
                  Personal Finance & Calendar Ledger
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Lv.{summary.currentLevel.level} • {summary.currentLevel.title}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Daily & Monthly Income (Green) and Expense (Reddish) Statement
              </p>
            </div>
          </div>

          {/* Right Controls: Month Switcher, Currency, Authenticated Profile */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Navigator */}
            <div className="flex items-center bg-stone-100 border border-stone-200 rounded-lg p-1">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded hover:bg-white text-stone-700 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span
                className="px-3 text-xs font-bold text-stone-800 whitespace-nowrap"
                style={{ fontFamily: "'Merriweather', serif" }}
              >
                {monthHeading}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 rounded hover:bg-white text-stone-700 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                savePreferencesToCloud({ currency: e.target.value });
              }}
              aria-label="Currency"
              className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Logged-In User Badge & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-stone-800 flex items-center justify-end gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  {memberName}
                </span>
                <span
                  className="text-[10px] text-stone-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {authReady && user
                    ? `ID: ${user.uid.slice(0, 8)}`
                    : 'Active Session'}
                </span>
              </div>
              <button
                onClick={handleLockOrSignOut}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200 text-stone-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                title="Sign Out / Lock Ledger"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================
          MAIN CONTENT CONTAINER
         =================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* =================================================================
            SECTION 1 (FIRST ON ENTRY): DIRECT EXPENSE & INCOME ENTRY CONSOLE
            + MONTHLY FINANCIAL SUMMARY & SAVINGS PROGRESS
           ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT 7 COLS: IMMEDIATE EXPENSE (REDDISH) & INCOME (GREEN) ENTRY PANEL */}
          <div
            className={`lg:col-span-7 rounded-xl bg-white border-2 transition-colors shadow-xs p-5 sm:p-6 flex flex-col justify-between ${
              isExpenseMode ? 'border-rose-700/80' : 'border-emerald-700/80'
            }`}
          >
            <div>
              {/* Top Mode Switcher: Reddish Expense vs. Green Income */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400 block">
                    {editingTxId
                      ? 'Update Existing Record'
                      : 'Direct Finance Entry'}
                  </span>
                  <h2
                    className="text-lg font-bold text-stone-900 mt-0.5"
                    style={{ fontFamily: "'Merriweather', serif" }}
                  >
                    {isExpenseMode
                      ? 'Record Daily Expense (-)'
                      : 'Record Income Inflow (+)'}
                  </h2>
                </div>

                {/* Dual-Mode Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-lg border border-stone-200">
                  <button
                    type="button"
                    onClick={() => handleSwitchEntryType('expense')}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer ${
                      isExpenseMode
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-rose-800'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>Expense (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchEntryType('income')}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer ${
                      !isExpenseMode
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-emerald-800'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Income (+)</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Quick Entry Presets */}
              <div className="py-3 border-b border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-stone-500">
                    1-Click Quick Record onto{' '}
                    <strong className="text-stone-800">{selectedDate}</strong>:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_CHIPS[entryType].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleQuickChipEntry(chip, entryType)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                        isExpenseMode
                          ? 'bg-rose-50/70 hover:bg-rose-100/80 text-rose-900 border-rose-200'
                          : 'bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span
                        className="font-bold"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {isExpenseMode ? '-' : '+'}
                        {formatCurrency(chip.amount, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Entry Form */}
              <form onSubmit={handleSaveEntry} className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  {/* Amount Input */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Amount ({CURRENCIES[currency]?.symbol})
                    </label>
                    <input
                      ref={entryAmountInputRef}
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-lg border text-base font-bold focus:outline-none ${
                        isExpenseMode
                          ? 'border-rose-300 focus:border-rose-700 text-rose-900 bg-rose-50/20'
                          : 'border-emerald-300 focus:border-emerald-700 text-emerald-900 bg-emerald-50/20'
                      }`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Category
                    </label>
                    <select
                      value={entryCategory}
                      onChange={(e) => setEntryCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 bg-white focus:outline-none focus:border-stone-600"
                    >
                      {Object.values(CATEGORIES)
                        .filter((c) => c.type === entryType)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Date Picker (Synced with Calendar) */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Entry Date
                    </label>
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => {
                        setEntryDate(e.target.value);
                        setSelectedDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 bg-white focus:outline-none focus:border-stone-600"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                </div>

                {/* Note + Quick Amount Increments + Submit Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    placeholder={
                      isExpenseMode
                        ? 'Note / Description (e.g., Weekly groceries, electricity bill)...'
                        : 'Note / Source (e.g., Monthly salary, consulting payout)...'
                    }
                    value={entryNote}
                    onChange={(e) => setEntryNote(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-stone-300 text-xs text-stone-800 bg-white focus:outline-none focus:border-stone-600"
                  />

                  {editingTxId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTxId(null);
                        setEntryAmount('');
                        setEntryNote('');
                      }}
                      className="px-3 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      isExpenseMode
                        ? 'bg-rose-700 hover:bg-rose-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    {isExpenseMode ? (
                      <MinusCircle className="w-4 h-4" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>
                      {editingTxId
                        ? 'Update Entry'
                        : isExpenseMode
                        ? 'Record Expense (-)'
                        : 'Record Income (+)'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT 5 COLS: MONTHLY OVERVIEW & REAL-TIME SAVINGS GOAL PROGRESS */}
          <div className="lg:col-span-5 rounded-xl bg-white border border-stone-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400 block">
                    Monthly Standing
                  </span>
                  <h2
                    className="text-lg font-bold text-stone-900 mt-0.5"
                    style={{ fontFamily: "'Merriweather', serif" }}
                  >
                    {monthHeading} Balance
                  </h2>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                    summary.netSavings >= 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {summary.savingsRatePct.toFixed(1)}% Saved
                </span>
              </div>

              {/* 3 Key Monthly Figures: Income (Green), Expense (Reddish), Net Balance */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80">
                  <span className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
                    Income
                  </span>
                  <div
                    className="text-base sm:text-lg font-bold text-emerald-800 mt-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    +{formatCurrency(summary.totalIncome, currency)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200/80">
                  <span className="text-[11px] font-semibold text-rose-900 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-700" />
                    Expense
                  </span>
                  <div
                    className="text-base sm:text-lg font-bold text-rose-800 mt-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    -{formatCurrency(summary.totalExpense, currency)}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    summary.netSavings >= 0
                      ? 'bg-stone-50 border-stone-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-stone-600 block">
                    Net Savings
                  </span>
                  <div
                    className={`text-base sm:text-lg font-bold mt-1 ${
                      summary.netSavings >= 0
                        ? 'text-emerald-800'
                        : 'text-rose-800'
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {summary.netSavings >= 0 ? '+' : ''}
                    {formatCurrency(summary.netSavings, currency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-Time Monthly Savings Target Bar */}
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-700" />
                  <span>Monthly Savings Target</span>
                </span>

                {isEditingGoal ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="w-24 px-2 py-0.5 text-xs font-bold border border-stone-300 rounded bg-white text-right"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <button
                      onClick={() => {
                        const v = Math.max(100, parseFloat(goalInput) || 1000);
                        setMonthlySavingsGoal(v);
                        setIsEditingGoal(false);
                        savePreferencesToCloud({ monthlySavingsGoal: v });
                      }}
                      className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setGoalInput(String(monthlySavingsGoal));
                      setIsEditingGoal(true);
                    }}
                    className="font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span>
                      Goal: {formatCurrency(monthlySavingsGoal, currency)}
                    </span>
                    <Edit3 className="w-3 h-3 text-stone-400" />
                  </button>
                )}
              </div>

              <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.netSavings < 0 ? 'bg-rose-600' : 'bg-emerald-700'
                  }`}
                  style={{
                    width: `${
                      summary.netSavings < 0
                        ? 100
                        : Math.min(100, summary.savingsGoalProgressPct)
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span>
                  {summary.netSavings >= monthlySavingsGoal
                    ? 'Monthly savings target achieved!'
                    : summary.netSavings >= 0
                    ? `${formatCurrency(
                        monthlySavingsGoal - summary.netSavings,
                        currency
                      )} remaining to reach target`
                    : `Expenses currently exceed income by ${formatCurrency(
                        Math.abs(summary.netSavings),
                        currency
                      )}`}
                </span>
                <span
                  className="font-bold text-stone-800"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {Math.round(summary.savingsGoalProgressPct)}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            SECTION 2 (CORE HIGHLIGHT): INTERACTIVE MONTHLY & DAILY CALENDAR SUMMARY
           ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 8 COLS: MONTHLY CALENDAR SUMMARY GRID */}
          <div className="lg:col-span-8 rounded-xl bg-white border border-stone-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-800" />
                  <h2
                    className="text-lg font-bold text-stone-900"
                    style={{ fontFamily: "'Merriweather', serif" }}
                  >
                    Monthly & Daily Calendar Summary — {monthHeading}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select any date to inspect its daily statement or log an entry
                  directly onto that day
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  +Income
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-800">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                  -Expense
                </span>
                <span className="inline-flex items-center gap-1.5 text-stone-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-400" />
                  No-Spend Day
                </span>
              </div>
            </div>

            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                (dayName) => (
                  <div key={dayName} className="py-1">
                    {dayName}
                  </div>
                )
              )}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div
                  key={`empty_${idx}`}
                  className="h-20 sm:h-24 rounded-lg bg-stone-50/40"
                />
              ))}

              {summary.dailyList.map((dayObj) => {
                const isSelected = dayObj.date === selectedDate;
                const isElapsed = dayObj.day <= elapsedDaysCount;
                const hasIncome = dayObj.income > 0;
                const hasExpense = dayObj.expense > 0;
                const isNoSpend = isElapsed && !hasExpense;

                // Subtle formal cell background based on daily activity
                let cellBg = 'bg-white border-stone-200 hover:border-stone-400';
                if (hasExpense && !hasIncome) {
                  cellBg =
                    'bg-rose-50/35 border-rose-200/90 hover:border-rose-400';
                } else if (hasIncome && !hasExpense) {
                  cellBg =
                    'bg-emerald-50/45 border-emerald-200/90 hover:border-emerald-400';
                } else if (hasIncome && hasExpense) {
                  cellBg =
                    dayObj.net >= 0
                      ? 'bg-emerald-50/30 border-emerald-300'
                      : 'bg-rose-50/30 border-rose-300';
                } else if (isNoSpend) {
                  cellBg =
                    'bg-emerald-50/20 border-stone-200 hover:border-emerald-400';
                }

                return (
                  <button
                    key={dayObj.date}
                    type="button"
                    onClick={() => handleSelectCalendarDate(dayObj.date)}
                    className={`h-20 sm:h-24 p-2 rounded-lg border text-left flex flex-col justify-between transition relative cursor-pointer ${cellBg} ${
                      isSelected
                        ? 'ring-2 ring-stone-900 border-stone-900 shadow-xs z-10'
                        : ''
                    }`}
                  >
                    {/* Top Row: Day Number & Net Status Dot */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-stone-950 underline'
                            : 'text-stone-700'
                        }`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {dayObj.day}
                      </span>

                      {(hasIncome || hasExpense) && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dayObj.net >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                          title={`Net: ${formatCurrency(dayObj.net, currency)}`}
                        />
                      )}
                    </div>

                    {/* Bottom Summary Totals inside Day Cell */}
                    <div
                      className="space-y-0.5 w-full truncate"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {hasIncome && (
                        <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-1 rounded truncate">
                          +{formatCurrency(dayObj.income, currency, true)}
                        </div>
                      )}
                      {hasExpense && (
                        <div className="text-[10px] sm:text-[11px] font-bold text-rose-800 bg-rose-100/80 px-1 rounded truncate">
                          -{formatCurrency(dayObj.expense, currency, true)}
                        </div>
                      )}
                      {!hasIncome && !hasExpense && isNoSpend && (
                        <div
                          className="text-[9px] font-semibold text-emerald-700 uppercase tracking-tighter truncate"
                          style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          No-Spend
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Monthly Summary Footer Strip */}
            <div className="pt-4 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block text-[11px]">
                  Daily Avg. Expense
                </span>
                <span
                  className="font-bold text-rose-800 text-sm mt-0.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatCurrency(summary.dailyAverageExpense, currency)} / day
                </span>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block text-[11px]">
                  No-Spend Days
                </span>
                <span
                  className="font-bold text-emerald-800 text-sm mt-0.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {summary.noSpendDays} of {elapsedDaysCount} days
                </span>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block text-[11px]">
                  Highest Spend Day
                </span>
                <span
                  className="font-bold text-rose-800 text-sm mt-0.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {summary.highestSpendDay
                    ? `${summary.highestSpendDay.date.slice(
                        5
                      )} (${formatCurrency(
                        summary.highestSpendDay.expense,
                        currency
                      )})`
                    : 'None'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block text-[11px]">
                  Monthly Entries
                </span>
                <span
                  className="font-bold text-stone-900 text-sm mt-0.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {monthTransactions.length} records
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: SELECTED DAY SUMMARY & TRANSACTION INSPECTOR */}
          <div className="lg:col-span-4 rounded-xl bg-white border border-stone-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="border-b border-stone-200 pb-3.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400 block">
                Selected Date Statement
              </span>
              <h3
                className="text-lg font-bold text-stone-900 mt-0.5"
                style={{ fontFamily: "'Merriweather', serif" }}
              >
                {formatReadableDate(selectedDate)}
              </h3>
            </div>

            {/* Selected Day Totals */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-900 block">
                  Day Income (+)
                </span>
                <span
                  className="text-base font-bold text-emerald-800 mt-0.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  +{formatCurrency(summary.selectedDayData.income, currency)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-900 block">
                  Day Expense (-)
                </span>
                <span
                  className="text-base font-bold text-rose-800 mt-0.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  -{formatCurrency(summary.selectedDayData.expense, currency)}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons for Selected Date */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleSwitchEntryType('expense');
                  setEntryDate(selectedDate);
                  if (entryAmountInputRef.current)
                    entryAmountInputRef.current.focus();
                }}
                className="py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <MinusCircle className="w-3.5 h-3.5 text-rose-700" />
                <span>+ Expense on {selectedDate.slice(8)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSwitchEntryType('income');
                  setEntryDate(selectedDate);
                  if (entryAmountInputRef.current)
                    entryAmountInputRef.current.focus();
                }}
                className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>+ Income on {selectedDate.slice(8)}</span>
              </button>
            </div>

            {/* Selected Day Transactions List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                <span>Entries on {selectedDate}</span>
                <span>{summary.selectedDayData.items.length} items</span>
              </div>

              {summary.selectedDayData.items.length === 0 ? (
                <div className="p-6 rounded-lg bg-stone-50 border border-stone-200 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
                  <p className="text-xs font-semibold text-stone-800">
                    No expenses or income recorded on this date
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Use the entry panel above or the quick buttons to log a
                    record for {selectedDate}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {summary.selectedDayData.items.map((item) => {
                    const cat =
                      CATEGORIES[item.category] || CATEGORIES.groceries;
                    const Icon = cat.icon;
                    const isInc = item.type === 'income';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                          isInc
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-2 rounded-md ${
                              isInc
                                ? 'bg-emerald-700 text-white'
                                : 'bg-rose-700 text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 truncate">
                              {item.note}
                            </p>
                            <p className="text-[11px] text-stone-500">
                              {cat.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-bold ${
                              isInc ? 'text-emerald-800' : 'text-rose-800'
                            }`}
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {isInc ? '+' : '-'}
                            {formatCurrency(item.amount, currency)}
                          </span>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-stone-400 hover:text-stone-800"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(item.id)}
                            className="p-1 text-stone-400 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =================================================================
            SECTION 3: FINANCIAL LEVEL & ACHIEVEMENT PROGRESSION BAR
           ================================================================= */}
        <section className="rounded-xl bg-white border border-stone-200 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Level Progress Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-800" />
                  <h2
                    className="text-base font-bold text-stone-900"
                    style={{ fontFamily: "'Merriweather', serif" }}
                  >
                    Financial Standing: Level {summary.currentLevel.level} —{' '}
                    {summary.currentLevel.title}
                  </h2>
                </div>
                <span
                  className="text-xs font-bold text-emerald-800"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {summary.points} pts
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                  style={{ width: `${summary.levelProgress}%` }}
                />
              </div>

              <p className="text-xs text-stone-500">
                {summary.nextLevel
                  ? `Progress toward Level ${summary.nextLevel.level} (${summary.nextLevel.title}) — earned through consistent record-keeping, No-Spend days, and positive savings.`
                  : 'Highest Sovereign Capitalist standing achieved.'}
              </p>
            </div>

            {/* 4 Key Achievement Milestones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-3/5">
              {summary.milestones.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border flex flex-col justify-between ${
                    m.achieved
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-stone-50 border-stone-200 text-stone-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold">{m.label}</span>
                    {m.achieved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      m.achieved ? 'text-emerald-800' : 'text-stone-600'
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {m.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            SECTION 4: ESSENTIAL CATEGORY BUDGETS & COMPLETE MONTHLY LEDGER
           ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 5 COLS: CATEGORY SPENDING LIMITS (GREEN -> REDDISH HEALTH BARS) */}
          <div className="lg:col-span-5 rounded-xl bg-white border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h2
                  className="text-base font-bold text-stone-900"
                  style={{ fontFamily: "'Merriweather', serif" }}
                >
                  Monthly Category Budgets
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Click any limit to adjust. Bars turn reddish as spending nears
                  cap.
                </p>
              </div>
              <span
                className="text-xs font-bold text-stone-700"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatCurrency(summary.totalExpense, currency)} /{' '}
                {formatCurrency(summary.totalBudgetAllocation, currency)}
              </span>
            </div>

            <div className="space-y-3.5">
              {Object.keys(budgets).map((catKey) => {
                const cat = CATEGORIES[catKey];
                if (!cat) return null;
                const Icon = cat.icon;
                const spent = summary.categoryTotals[catKey] || 0;
                const cap = budgets[catKey] || 100;
                const pct = Math.min(
                  100,
                  Math.round((spent / Math.max(1, cap)) * 100)
                );
                const isOver = spent > cap;
                const isWarning = !isOver && pct >= 80;

                return (
                  <div
                    key={catKey}
                    className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-stone-800">
                        <Icon
                          className={`w-4 h-4 ${
                            isOver || isWarning
                              ? 'text-rose-700'
                              : 'text-emerald-700'
                          }`}
                        />
                        <span>{cat.name}</span>
                      </div>

                      <div
                        className="flex items-center gap-1.5"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        <span
                          className={`font-bold ${
                            isOver ? 'text-rose-700' : 'text-stone-800'
                          }`}
                        >
                          {formatCurrency(spent, currency)}
                        </span>
                        <span className="text-stone-400">/</span>

                        {editingBudgetCat === catKey ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={budgetInputVal}
                              onChange={(e) =>
                                setBudgetInputVal(e.target.value)
                              }
                              className="w-20 px-1.5 py-0.5 text-xs font-bold border border-stone-300 rounded bg-white text-right"
                            />
                            <button
                              onClick={() => {
                                const nextVal = Math.max(
                                  20,
                                  parseFloat(budgetInputVal) || 100
                                );
                                const updated = {
                                  ...budgets,
                                  [catKey]: nextVal,
                                };
                                setBudgets(updated);
                                setEditingBudgetCat(null);
                                savePreferencesToCloud({ budgets: updated });
                              }}
                              className="p-0.5 text-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBudgetCat(catKey);
                              setBudgetInputVal(String(cap));
                            }}
                            className="font-semibold text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{formatCurrency(cap, currency)}</span>
                            <Edit3 className="w-3 h-3 text-stone-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar: Green when safe, Reddish when high/exceeded */}
                    <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver
                            ? 'bg-rose-700'
                            : isWarning
                            ? 'bg-rose-500'
                            : 'bg-emerald-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT 7 COLS: CLEAN MONTHLY TRANSACTION LEDGER */}
          <div className="lg:col-span-7 rounded-xl bg-white border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <h2
                  className="text-base font-bold text-stone-900"
                  style={{ fontFamily: "'Merriweather', serif" }}
                >
                  Complete Monthly Ledger ({monthHeading})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Showing {filteredLedger.length} records • Green for Income
                  (+), Reddish for Expense (-)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>

                {confirmReset ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                    <span className="text-xs font-semibold text-rose-800">
                      Restore sample?
                    </span>
                    <button
                      onClick={handleResetSampleData}
                      className="px-2 py-0.5 rounded bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-1.5 py-0.5 text-xs text-stone-600 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                    <span>Reset Sample</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Tabs: All / Income (Green) / Expense (Reddish) */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200">
                <button
                  onClick={() => setLedgerFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    ledgerFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600'
                  }`}
                >
                  All ({monthTransactions.length})
                </button>
                <button
                  onClick={() => setLedgerFilter('income')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    ledgerFilter === 'income'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  + Income
                </button>
                <button
                  onClick={() => setLedgerFilter('expense')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    ledgerFilter === 'expense'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'text-rose-800 hover:bg-rose-50'
                  }`}
                >
                  - Expense
                </button>
              </div>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search description, category, or amount..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-800 bg-white focus:outline-none focus:border-stone-600"
                />
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-stone-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description & Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-stone-500"
                      >
                        No transactions match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx) => {
                      const cat =
                        CATEGORIES[tx.category] || CATEGORIES.groceries;
                      const isInc = tx.type === 'income';
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => handleSelectCalendarDate(tx.date)}
                          className={`cursor-pointer transition ${
                            tx.date === selectedDate
                              ? 'bg-stone-100/80'
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <td
                            className="py-3 px-3 font-semibold text-stone-700 whitespace-nowrap"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {tx.date}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-stone-900">
                              {tx.note}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {cat.name}
                            </div>
                          </td>
                          <td
                            className="py-3 px-3 text-right whitespace-nowrap font-bold"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded border ${
                                isInc
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {isInc ? '+' : '-'}
                              {formatCurrency(tx.amount, currency)}
                            </span>
                          </td>
                          <td
                            className="py-3 px-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleStartEdit(tx)}
                              className="p-1 text-stone-400 hover:text-stone-800 mr-1"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(tx.id)}
                              className="p-1 text-stone-400 hover:text-rose-700"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
