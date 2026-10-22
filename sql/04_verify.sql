-- Expected counts apply immediately after seeding, before CRUD changes.
SELECT 'HW_BRANCHES' AS table_name, COUNT(*) AS actual_rows, 3 AS expected_rows FROM HW_BRANCHES
UNION ALL
SELECT 'HW_CUSTOMERS' AS table_name, COUNT(*) AS actual_rows, 4 AS expected_rows FROM HW_CUSTOMERS
UNION ALL
SELECT 'HW_EMPLOYEES' AS table_name, COUNT(*) AS actual_rows, 3 AS expected_rows FROM HW_EMPLOYEES
UNION ALL
SELECT 'HW_ACCOUNT_TYPES' AS table_name, COUNT(*) AS actual_rows, 3 AS expected_rows FROM HW_ACCOUNT_TYPES
UNION ALL
SELECT 'HW_ACCOUNTS' AS table_name, COUNT(*) AS actual_rows, 4 AS expected_rows FROM HW_ACCOUNTS
UNION ALL
SELECT 'HW_ACCOUNT_HOLDERS' AS table_name, COUNT(*) AS actual_rows, 5 AS expected_rows FROM HW_ACCOUNT_HOLDERS
UNION ALL
SELECT 'HW_TRANSACTIONS' AS table_name, COUNT(*) AS actual_rows, 4 AS expected_rows FROM HW_TRANSACTIONS
UNION ALL
SELECT 'HW_LOAN_TYPES' AS table_name, COUNT(*) AS actual_rows, 3 AS expected_rows FROM HW_LOAN_TYPES
UNION ALL
SELECT 'HW_LOANS' AS table_name, COUNT(*) AS actual_rows, 3 AS expected_rows FROM HW_LOANS
UNION ALL
SELECT 'HW_LOAN_PAYMENTS' AS table_name, COUNT(*) AS actual_rows, 3 AS expected_rows FROM HW_LOAN_PAYMENTS;

-- All orphan_count values must be zero.
SELECT 'employees.branch_id' AS relationship, COUNT(*) AS orphan_count FROM HW_EMPLOYEES c WHERE c.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_BRANCHES p WHERE p.id = c.branch_id)
UNION ALL
SELECT 'accounts.branch_id' AS relationship, COUNT(*) AS orphan_count FROM HW_ACCOUNTS c WHERE c.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_BRANCHES p WHERE p.id = c.branch_id)
UNION ALL
SELECT 'accounts.account_type_id' AS relationship, COUNT(*) AS orphan_count FROM HW_ACCOUNTS c WHERE c.account_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_ACCOUNT_TYPES p WHERE p.id = c.account_type_id)
UNION ALL
SELECT 'account_holders.account_id' AS relationship, COUNT(*) AS orphan_count FROM HW_ACCOUNT_HOLDERS c WHERE c.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_ACCOUNTS p WHERE p.id = c.account_id)
UNION ALL
SELECT 'account_holders.customer_id' AS relationship, COUNT(*) AS orphan_count FROM HW_ACCOUNT_HOLDERS c WHERE c.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_CUSTOMERS p WHERE p.id = c.customer_id)
UNION ALL
SELECT 'transactions.account_id' AS relationship, COUNT(*) AS orphan_count FROM HW_TRANSACTIONS c WHERE c.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_ACCOUNTS p WHERE p.id = c.account_id)
UNION ALL
SELECT 'transactions.employee_id' AS relationship, COUNT(*) AS orphan_count FROM HW_TRANSACTIONS c WHERE c.employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_EMPLOYEES p WHERE p.id = c.employee_id)
UNION ALL
SELECT 'loans.customer_id' AS relationship, COUNT(*) AS orphan_count FROM HW_LOANS c WHERE c.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_CUSTOMERS p WHERE p.id = c.customer_id)
UNION ALL
SELECT 'loans.branch_id' AS relationship, COUNT(*) AS orphan_count FROM HW_LOANS c WHERE c.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_BRANCHES p WHERE p.id = c.branch_id)
UNION ALL
SELECT 'loans.loan_type_id' AS relationship, COUNT(*) AS orphan_count FROM HW_LOANS c WHERE c.loan_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_LOAN_TYPES p WHERE p.id = c.loan_type_id)
UNION ALL
SELECT 'loans.employee_id' AS relationship, COUNT(*) AS orphan_count FROM HW_LOANS c WHERE c.employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_EMPLOYEES p WHERE p.id = c.employee_id)
UNION ALL
SELECT 'loan_payments.loan_id' AS relationship, COUNT(*) AS orphan_count FROM HW_LOAN_PAYMENTS c WHERE c.loan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_LOANS p WHERE p.id = c.loan_id)
UNION ALL
SELECT 'loan_payments.account_id' AS relationship, COUNT(*) AS orphan_count FROM HW_LOAN_PAYMENTS c WHERE c.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM HW_ACCOUNTS p WHERE p.id = c.account_id);

-- APEX-friendly alternative to DESCRIBE; restrict to this scenario's tables.
SELECT table_name, column_name, data_type, nullable
FROM user_tab_columns
WHERE table_name IN ('HW_BRANCHES', 'HW_CUSTOMERS', 'HW_EMPLOYEES', 'HW_ACCOUNT_TYPES', 'HW_ACCOUNTS', 'HW_ACCOUNT_HOLDERS', 'HW_TRANSACTIONS', 'HW_LOAN_TYPES', 'HW_LOANS', 'HW_LOAN_PAYMENTS')
ORDER BY table_name, column_id;

SELECT table_name, constraint_type, status
FROM user_constraints
WHERE table_name IN ('HW_BRANCHES', 'HW_CUSTOMERS', 'HW_EMPLOYEES', 'HW_ACCOUNT_TYPES', 'HW_ACCOUNTS', 'HW_ACCOUNT_HOLDERS', 'HW_TRANSACTIONS', 'HW_LOAN_TYPES', 'HW_LOANS', 'HW_LOAN_PAYMENTS')
ORDER BY table_name, constraint_type;
