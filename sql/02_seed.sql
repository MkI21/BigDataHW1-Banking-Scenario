-- Generated synthetic data. Run once after 01_schema.sql.
BEGIN
  INSERT INTO HW_BRANCHES (id, name, city) VALUES (1, 'Central', 'Bucharest');
  INSERT INTO HW_BRANCHES (id, name, city) VALUES (2, 'Riverside', 'Cluj');
  INSERT INTO HW_BRANCHES (id, name, city) VALUES (3, 'New Town', 'Iasi');
  INSERT INTO HW_CUSTOMERS (id, name, email) VALUES (1, 'Ana Pop', 'ana@example.test');
  INSERT INTO HW_CUSTOMERS (id, name, email) VALUES (2, 'Dan Ionescu', 'dan@example.test');
  INSERT INTO HW_CUSTOMERS (id, name, email) VALUES (3, 'Mara Stan', 'mara@example.test');
  INSERT INTO HW_CUSTOMERS (id, name, email) VALUES (4, 'Victor Radu', 'victor@example.test');
  INSERT INTO HW_EMPLOYEES (id, branch_id, name, role) VALUES (1, 1, 'Elena Marin', 'TELLER');
  INSERT INTO HW_EMPLOYEES (id, branch_id, name, role) VALUES (2, 1, 'Paul Dima', 'ADVISOR');
  INSERT INTO HW_EMPLOYEES (id, branch_id, name, role) VALUES (3, 2, 'Ioana Pavel', 'MANAGER');
  INSERT INTO HW_ACCOUNT_TYPES (id, name, monthly_fee) VALUES (1, 'Current', 5);
  INSERT INTO HW_ACCOUNT_TYPES (id, name, monthly_fee) VALUES (2, 'Savings', 0);
  INSERT INTO HW_ACCOUNT_TYPES (id, name, monthly_fee) VALUES (3, 'Student', 0);
  INSERT INTO HW_ACCOUNTS (id, branch_id, account_type_id, account_number, balance, opened_on, status) VALUES (1, 1, 1, 'DEMO0001', 1200, TO_DATE('2025-01-10', 'YYYY-MM-DD'), 'ACTIVE');
  INSERT INTO HW_ACCOUNTS (id, branch_id, account_type_id, account_number, balance, opened_on, status) VALUES (2, 1, 2, 'DEMO0002', 5000, TO_DATE('2025-02-12', 'YYYY-MM-DD'), 'ACTIVE');
  INSERT INTO HW_ACCOUNTS (id, branch_id, account_type_id, account_number, balance, opened_on, status) VALUES (3, 2, 1, 'DEMO0003', 0, TO_DATE('2025-03-01', 'YYYY-MM-DD'), 'CLOSED');
  INSERT INTO HW_ACCOUNTS (id, branch_id, account_type_id, account_number, balance, opened_on, status) VALUES (4, 2, 2, 'DEMO0004', 800, TO_DATE('2025-04-05', 'YYYY-MM-DD'), 'ACTIVE');
  INSERT INTO HW_ACCOUNT_HOLDERS (id, account_id, customer_id, holder_role) VALUES (1, 1, 1, 'PRIMARY');
  INSERT INTO HW_ACCOUNT_HOLDERS (id, account_id, customer_id, holder_role) VALUES (2, 1, 2, 'JOINT');
  INSERT INTO HW_ACCOUNT_HOLDERS (id, account_id, customer_id, holder_role) VALUES (3, 2, 1, 'PRIMARY');
  INSERT INTO HW_ACCOUNT_HOLDERS (id, account_id, customer_id, holder_role) VALUES (4, 3, 3, 'PRIMARY');
  INSERT INTO HW_ACCOUNT_HOLDERS (id, account_id, customer_id, holder_role) VALUES (5, 4, 2, 'PRIMARY');
  INSERT INTO HW_TRANSACTIONS (id, account_id, employee_id, kind, amount, occurred_on) VALUES (1, 1, 1, 'DEPOSIT', 1500, TO_DATE('2025-05-01', 'YYYY-MM-DD'));
  INSERT INTO HW_TRANSACTIONS (id, account_id, employee_id, kind, amount, occurred_on) VALUES (2, 1, NULL, 'WITHDRAWAL', 300, TO_DATE('2025-05-02', 'YYYY-MM-DD'));
  INSERT INTO HW_TRANSACTIONS (id, account_id, employee_id, kind, amount, occurred_on) VALUES (3, 2, 2, 'DEPOSIT', 5000, TO_DATE('2025-05-03', 'YYYY-MM-DD'));
  INSERT INTO HW_TRANSACTIONS (id, account_id, employee_id, kind, amount, occurred_on) VALUES (4, 4, NULL, 'DEPOSIT', 800, TO_DATE('2025-05-04', 'YYYY-MM-DD'));
  INSERT INTO HW_LOAN_TYPES (id, name, annual_rate) VALUES (1, 'Personal', 8.5);
  INSERT INTO HW_LOAN_TYPES (id, name, annual_rate) VALUES (2, 'Home', 5.25);
  INSERT INTO HW_LOAN_TYPES (id, name, annual_rate) VALUES (3, 'Education', 3);
  INSERT INTO HW_LOANS (id, customer_id, branch_id, loan_type_id, employee_id, principal, issued_on, status) VALUES (1, 1, 1, 1, 2, 10000, TO_DATE('2025-03-10', 'YYYY-MM-DD'), 'ACTIVE');
  INSERT INTO HW_LOANS (id, customer_id, branch_id, loan_type_id, employee_id, principal, issued_on, status) VALUES (2, 2, 2, 2, 3, 200000, TO_DATE('2025-04-01', 'YYYY-MM-DD'), 'ACTIVE');
  INSERT INTO HW_LOANS (id, customer_id, branch_id, loan_type_id, employee_id, principal, issued_on, status) VALUES (3, 3, 1, 1, 2, 1000, TO_DATE('2025-01-15', 'YYYY-MM-DD'), 'PAID');
  INSERT INTO HW_LOAN_PAYMENTS (id, loan_id, account_id, amount, paid_on) VALUES (1, 1, 1, 500, TO_DATE('2025-05-10', 'YYYY-MM-DD'));
  INSERT INTO HW_LOAN_PAYMENTS (id, loan_id, account_id, amount, paid_on) VALUES (2, 1, 1, 500, TO_DATE('2025-06-10', 'YYYY-MM-DD'));
  INSERT INTO HW_LOAN_PAYMENTS (id, loan_id, account_id, amount, paid_on) VALUES (3, 3, 3, 1000, TO_DATE('2025-02-15', 'YYYY-MM-DD'));
  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/
