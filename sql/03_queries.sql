-- Ten exercises, exactly FOUR explicit JOIN clauses in EVERY SELECT.
-- Run individually in SQL Commands or together in APEX SQL Scripts.
-- Expected row counts below assume the original seed, before any edits.

-- 1. INNER: Who holds which account, at which branch, of which type? (5 rows)
SELECT c.name AS customer, a.account_number, h.holder_role,
       b.name AS branch, atp.name AS account_type
FROM HW_ACCOUNTS a
INNER JOIN HW_ACCOUNT_HOLDERS h ON h.account_id = a.id
INNER JOIN HW_CUSTOMERS c ON c.id = h.customer_id
INNER JOIN HW_BRANCHES b ON b.id = a.branch_id
INNER JOIN HW_ACCOUNT_TYPES atp ON atp.id = a.account_type_id
ORDER BY a.id, c.id;

-- 2. LEFT: Keep every customer, including Victor with no account. (6 rows)
SELECT c.name AS customer, NVL(a.account_number, '(no account)') AS account_number,
       b.name AS branch, atp.name AS account_type
FROM HW_CUSTOMERS c
LEFT JOIN HW_ACCOUNT_HOLDERS h ON h.customer_id = c.id
LEFT JOIN HW_ACCOUNTS a ON a.id = h.account_id
LEFT JOIN HW_BRANCHES b ON b.id = a.branch_id
LEFT JOIN HW_ACCOUNT_TYPES atp ON atp.id = a.account_type_id
ORDER BY c.id, a.id;

-- 3. RIGHT: Preserve the branch on the right, even New Town with no accounts. (6 rows)
SELECT b.name AS branch, a.account_number, atp.name AS account_type, c.name AS customer
FROM HW_ACCOUNTS a
RIGHT JOIN HW_BRANCHES b ON b.id = a.branch_id
LEFT JOIN HW_ACCOUNT_TYPES atp ON atp.id = a.account_type_id
LEFT JOIN HW_ACCOUNT_HOLDERS h ON h.account_id = a.id
LEFT JOIN HW_CUSTOMERS c ON c.id = h.customer_id
ORDER BY b.id, a.id, c.id;

-- 4. Mixed: Employee is optional; retain self-service transactions. (4 rows)
SELECT t.id, a.account_number, b.name AS account_branch, atp.name AS account_type,
       NVL(e.name, 'Self-service') AS handled_by, t.kind, t.amount,
       TO_CHAR(t.occurred_on, 'YYYY-MM-DD') AS occurred_on
FROM HW_TRANSACTIONS t
INNER JOIN HW_ACCOUNTS a ON a.id = t.account_id
INNER JOIN HW_BRANCHES b ON b.id = a.branch_id
LEFT JOIN HW_EMPLOYEES e ON e.id = t.employee_id
INNER JOIN HW_ACCOUNT_TYPES atp ON atp.id = a.account_type_id
ORDER BY t.id;

-- 5. INNER: Loan portfolio with borrower, branch, product and advisor. (3 rows)
SELECT l.id, c.name AS borrower, b.name AS branch, lt.name AS loan_type,
       e.name AS advisor, l.principal, lt.annual_rate, l.status
FROM HW_LOANS l
INNER JOIN HW_CUSTOMERS c ON c.id = l.customer_id
INNER JOIN HW_BRANCHES b ON b.id = l.branch_id
INNER JOIN HW_LOAN_TYPES lt ON lt.id = l.loan_type_id
INNER JOIN HW_EMPLOYEES e ON e.id = l.employee_id
ORDER BY l.id;

-- 6. INNER: Trace each payment to its borrower and paying account's branch. (3 rows)
SELECT p.id, l.id AS loan_id, c.name AS borrower, a.account_number,
       b.name AS paying_branch, p.amount, TO_CHAR(p.paid_on, 'YYYY-MM-DD') AS paid_on
FROM HW_LOAN_PAYMENTS p
INNER JOIN HW_LOANS l ON l.id = p.loan_id
INNER JOIN HW_CUSTOMERS c ON c.id = l.customer_id
INNER JOIN HW_ACCOUNTS a ON a.id = p.account_id
INNER JOIN HW_BRANCHES b ON b.id = a.branch_id
ORDER BY p.id;

-- 7. LEFT: Include unused loan types and loans awaiting their first payment. (5 rows)
SELECT lt.name AS loan_type, l.id AS loan_id, c.name AS borrower,
       b.name AS loan_branch, p.id AS payment_id, p.amount
FROM HW_LOAN_TYPES lt
LEFT JOIN HW_LOANS l ON l.loan_type_id = lt.id
LEFT JOIN HW_LOAN_PAYMENTS p ON p.loan_id = l.id
LEFT JOIN HW_CUSTOMERS c ON c.id = l.customer_id
LEFT JOIN HW_BRANCHES b ON b.id = l.branch_id
ORDER BY lt.id, l.id, p.id;

-- 8. FULL OUTER: Preserve both sides; Student is an unused account type. (6 rows)
-- The FK prevents orphan accounts, so no account-only rows exist in valid data.
SELECT atp.name AS account_type, a.account_number, b.name AS branch, c.name AS customer
FROM HW_ACCOUNT_TYPES atp
FULL OUTER JOIN HW_ACCOUNTS a ON a.account_type_id = atp.id
LEFT JOIN HW_BRANCHES b ON b.id = a.branch_id
LEFT JOIN HW_ACCOUNT_HOLDERS h ON h.account_id = a.id
LEFT JOIN HW_CUSTOMERS c ON c.id = h.customer_id
ORDER BY atp.id, a.id, c.id;

-- 9. LEFT: Advisors' loans, retaining employees without loans and unstaffed branches. (5 rows)
SELECT b.name AS employee_branch, e.name AS employee, l.id AS loan_id,
       c.name AS borrower, lt.name AS loan_type
FROM HW_BRANCHES b
LEFT JOIN HW_EMPLOYEES e ON e.branch_id = b.id
LEFT JOIN HW_LOANS l ON l.employee_id = e.id
LEFT JOIN HW_CUSTOMERS c ON c.id = l.customer_id
LEFT JOIN HW_LOAN_TYPES lt ON lt.id = l.loan_type_id
ORDER BY b.id, e.id, l.id;

-- 10. Aggregate: Activity counts per account, including inactive accounts. (4 rows)
-- DISTINCT avoids overcounting the transaction x payment fan-out; do not SUM amounts here.
SELECT a.account_number, b.name AS branch, atp.name AS account_type,
       COUNT(DISTINCT t.id) AS transaction_count,
       COUNT(DISTINCT p.id) AS payment_count
FROM HW_ACCOUNTS a
INNER JOIN HW_BRANCHES b ON b.id = a.branch_id
INNER JOIN HW_ACCOUNT_TYPES atp ON atp.id = a.account_type_id
LEFT JOIN HW_TRANSACTIONS t ON t.account_id = a.id
LEFT JOIN HW_LOAN_PAYMENTS p ON p.account_id = a.id
GROUP BY a.id, a.account_number, b.name, atp.name
ORDER BY a.id;
