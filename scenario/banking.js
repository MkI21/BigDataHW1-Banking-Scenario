// Parents appear before children so creation and seeding follow dependency order.
const text = (label, max = 80, extra = {}) => ({ label, type: 'text', max, required: true, ...extra });
const integer = (label, extra = {}) => ({ label, type: 'integer', min: 1, max: 2147483647, required: true, ...extra });
const money = label => ({ label, type: 'money', min: 0, max: 9999999999.99, required: true });
const date = label => ({ label, type: 'date', required: true });
const ref = (label, entity, required = true) => integer(label, { ref: entity, required });
const entity = (name, label, display, fields, rows, unique = []) => ({
  name, label, display, fields: { id: integer('ID'), ...fields }, unique, rows
});

export const scenario = {
  title: 'Banking homework',
  prefix: 'HW_',
  entities: [
    entity('branches', 'Branches', 'name', {
      name: text('Branch name', 60, { unique: true }), city: text('City', 60)
    }, [
      { id: 1, name: 'Central', city: 'Bucharest' },
      { id: 2, name: 'Riverside', city: 'Cluj' },
      { id: 3, name: 'New Town', city: 'Iasi' }
    ]),
    entity('customers', 'Customers', 'name', {
      name: text('Full name'), email: text('Email', 120, { unique: true })
    }, [
      { id: 1, name: 'Ana Pop', email: 'ana@example.test' },
      { id: 2, name: 'Dan Ionescu', email: 'dan@example.test' },
      { id: 3, name: 'Mara Stan', email: 'mara@example.test' },
      { id: 4, name: 'Victor Radu', email: 'victor@example.test' }
    ]),
    entity('employees', 'Employees', 'name', {
      branch_id: ref('Branch', 'branches'), name: text('Full name'),
      role: text('Role', 30, { enum: ['TELLER', 'ADVISOR', 'MANAGER'] })
    }, [
      { id: 1, branch_id: 1, name: 'Elena Marin', role: 'TELLER' },
      { id: 2, branch_id: 1, name: 'Paul Dima', role: 'ADVISOR' },
      { id: 3, branch_id: 2, name: 'Ioana Pavel', role: 'MANAGER' }
    ]),
    entity('account_types', 'Account types', 'name', {
      name: text('Type name', 40, { unique: true }), monthly_fee: money('Monthly fee')
    }, [
      { id: 1, name: 'Current', monthly_fee: 5 },
      { id: 2, name: 'Savings', monthly_fee: 0 },
      { id: 3, name: 'Student', monthly_fee: 0 }
    ]),
    entity('accounts', 'Accounts', 'account_number', {
      branch_id: ref('Branch', 'branches'), account_type_id: ref('Account type', 'account_types'),
      account_number: text('Account number', 24, { unique: true }),
      balance: money('Balance (RON)'), opened_on: date('Opened on'),
      status: text('Status', 10, { enum: ['ACTIVE', 'CLOSED'] })
    }, [
      { id: 1, branch_id: 1, account_type_id: 1, account_number: 'DEMO0001', balance: 1200, opened_on: '2025-01-10', status: 'ACTIVE' },
      { id: 2, branch_id: 1, account_type_id: 2, account_number: 'DEMO0002', balance: 5000, opened_on: '2025-02-12', status: 'ACTIVE' },
      { id: 3, branch_id: 2, account_type_id: 1, account_number: 'DEMO0003', balance: 0, opened_on: '2025-03-01', status: 'CLOSED' },
      { id: 4, branch_id: 2, account_type_id: 2, account_number: 'DEMO0004', balance: 800, opened_on: '2025-04-05', status: 'ACTIVE' }
    ]),
    entity('account_holders', 'Account holders', 'id', {
      account_id: ref('Account', 'accounts'), customer_id: ref('Customer', 'customers'),
      holder_role: text('Holder role', 10, { enum: ['PRIMARY', 'JOINT'] })
    }, [
      { id: 1, account_id: 1, customer_id: 1, holder_role: 'PRIMARY' },
      { id: 2, account_id: 1, customer_id: 2, holder_role: 'JOINT' },
      { id: 3, account_id: 2, customer_id: 1, holder_role: 'PRIMARY' },
      { id: 4, account_id: 3, customer_id: 3, holder_role: 'PRIMARY' },
      { id: 5, account_id: 4, customer_id: 2, holder_role: 'PRIMARY' }
    ], [['account_id', 'customer_id']]),
    entity('transactions', 'Transactions', 'id', {
      account_id: ref('Account', 'accounts'), employee_id: ref('Employee (optional)', 'employees', false),
      kind: text('Kind', 10, { enum: ['DEPOSIT', 'WITHDRAWAL'] }),
      amount: { ...money('Amount (RON)'), exclusiveMin: true },
      occurred_on: date('Occurred on')
    }, [
      { id: 1, account_id: 1, employee_id: 1, kind: 'DEPOSIT', amount: 1500, occurred_on: '2025-05-01' },
      { id: 2, account_id: 1, employee_id: null, kind: 'WITHDRAWAL', amount: 300, occurred_on: '2025-05-02' },
      { id: 3, account_id: 2, employee_id: 2, kind: 'DEPOSIT', amount: 5000, occurred_on: '2025-05-03' },
      { id: 4, account_id: 4, employee_id: null, kind: 'DEPOSIT', amount: 800, occurred_on: '2025-05-04' }
    ]),
    entity('loan_types', 'Loan types', 'name', {
      name: text('Type name', 40, { unique: true }),
      annual_rate: { ...money('Annual rate (%)'), max: 100 }
    }, [
      { id: 1, name: 'Personal', annual_rate: 8.5 },
      { id: 2, name: 'Home', annual_rate: 5.25 },
      { id: 3, name: 'Education', annual_rate: 3 }
    ]),
    entity('loans', 'Loans', 'id', {
      customer_id: ref('Customer', 'customers'), branch_id: ref('Branch', 'branches'),
      loan_type_id: ref('Loan type', 'loan_types'), employee_id: ref('Advisor', 'employees'),
      principal: { ...money('Principal (RON)'), exclusiveMin: true }, issued_on: date('Issued on'),
      status: text('Status', 10, { enum: ['ACTIVE', 'PAID'] })
    }, [
      { id: 1, customer_id: 1, branch_id: 1, loan_type_id: 1, employee_id: 2, principal: 10000, issued_on: '2025-03-10', status: 'ACTIVE' },
      { id: 2, customer_id: 2, branch_id: 2, loan_type_id: 2, employee_id: 3, principal: 200000, issued_on: '2025-04-01', status: 'ACTIVE' },
      { id: 3, customer_id: 3, branch_id: 1, loan_type_id: 1, employee_id: 2, principal: 1000, issued_on: '2025-01-15', status: 'PAID' }
    ]),
    entity('loan_payments', 'Loan payments', 'id', {
      loan_id: ref('Loan', 'loans'), account_id: ref('Paying account', 'accounts'),
      amount: { ...money('Amount (RON)'), exclusiveMin: true }, paid_on: date('Paid on')
    }, [
      { id: 1, loan_id: 1, account_id: 1, amount: 500, paid_on: '2025-05-10' },
      { id: 2, loan_id: 1, account_id: 1, amount: 500, paid_on: '2025-06-10' },
      { id: 3, loan_id: 3, account_id: 3, amount: 1000, paid_on: '2025-02-15' }
    ])
  ]
};

export const byName = Object.fromEntries(scenario.entities.map(e => [e.name, e]));
