// Initialize AOS animation (guarded so missing libraries don't break login)
        if (window.AOS && typeof AOS.init === 'function') {
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true
            });
        }
        
        // Initialize EmailJS (guarded)
        if (window.emailjs && typeof emailjs.init === 'function') {
            emailjs.init("YOUR_PUBLIC_KEY"); // ستحتاج إلى الحصول على Public Key من EmailJS
        }
        
        // Global variables
        let currentUser = null;
        let editMode = false;
        let currentPage = 'home';
        let users = [];
        let employees = [];
        let discounts = [];
        let contracts = [];
        let vehicles = [];
        let ratings = [];
        let roles = [];
        let permissions = {};
        // Per-user granular permissions overrides
        let userPermissions = {};
        let selectedCriteria = [];
        let ratingStars = 0;
        let currencySymbol = 'IQD';
        let activityLog = [];
        let contentEdits = [];
        let availableJobs = [];
        // Company instructions (multi-page)
        let instructionPages = [];

        /* -------------------------------------------------------------------------- */
        /*                               Realtime API                                  */
        /* -------------------------------------------------------------------------- */
        let API_BASE = 'http://localhost:8787';
        let apiToken = null;
        let socket = null;

        function loadApiConfig() {
            try {
                API_BASE = localStorage.getItem('smartEraApiBase') || API_BASE;
                apiToken = localStorage.getItem('smartEraApiToken') || null;
            } catch (_) {}
        }

        async function apiFetch(path, opts = {}) {
            loadApiConfig();
            const url = (API_BASE || '').replace(/\/$/, '') + path;
            const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
            if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;
            const res = await fetch(url, { ...opts, headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data?.message || data?.error || 'حدث خطأ في الخادم';
                throw new Error(msg);
            }
            return data;
        }

        async function serverLogin(email, password) {
            const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) , headers: {} });
            if (data?.token) {
                apiToken = data.token;
                try { localStorage.setItem('smartEraApiToken', apiToken); } catch (_) {}
            }
            return data?.user || null;
        }

        async function serverLogout() {
            try { await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' }); } catch (_) {}
            apiToken = null;
            try { localStorage.removeItem('smartEraApiToken'); } catch (_) {}
        }

        function connectSocket() {
            loadApiConfig();
            if (!window.io || !apiToken) return null;
            if (socket && socket.connected) return socket;
            try {
                socket = window.io((API_BASE || '').replace(/\/$/, ''), { transports: ['websocket'] });
                socket.on('connect', () => {
                    socket.emit('auth', { token: apiToken });
                });
                socket.on('auth_error', () => {
                    // token invalid
                    try { localStorage.removeItem('smartEraApiToken'); } catch (_) {}
                });
            } catch (_) {
                socket = null;
            }
            return socket;
        }

        /* -------------------------------------------------------------------------- */
        /*                                  Theme                                     */
        /* -------------------------------------------------------------------------- */
        function applyTheme(theme) {
            const t = theme === 'dark' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', t);
            try { localStorage.setItem('theme', t); } catch (_) {}

            // Update icon (if exists)
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.classList.remove('bi-moon-stars', 'bi-sun');
                icon.classList.add(t === 'dark' ? 'bi-sun' : 'bi-moon-stars');
            }
        }

        function initTheme() {
            let saved = 'light';
            try { saved = localStorage.getItem('theme') || 'light'; } catch (_) {}
            applyTheme(saved);
        }

        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        }

        // Permissions UI state
        let selectedUserPermissionsId = null;
        
        // Pagination variables
        let currentEmployeePage = 1;
        let currentDiscountPage = 1;
        let currentMyDiscountPage = 1;
        let currentContractPage = 1;
        let currentVehiclePage = 1;
        let currentMyRatingPage = 1;
        let currentRatingPage = 1;
        let currentUserPage = 1;
        const itemsPerPage = 10;
        
        // Search and filter variables
        let employeeSearchTerm = '';
        let employeeStatusFilter = '';
        let employeeTypeFilter = 'all';
        
        let myDiscountsSearchTerm = '';
        let myDiscountsYearFilter = '';
        let myDiscountsStatusFilter = '';
        
        let discountsSearchTerm = '';
        let discountsMonthFilter = '';
        let discountsStatusFilter = '';
        
        let contractsSearchTerm = '';
        let contractsTypeFilter = '';
        let contractsStatusFilter = '';
        
        let vehiclesSearchTerm = '';
        let vehiclesTypeFilter = '';
        let vehiclesStatusFilter = '';
        
        let myRatingsSearchTerm = '';
        let myRatingsMonthFilter = '';
        let myRatingsMinFilter = '';
        
        let ratingsSearchTerm = '';
        let ratingsMonthFilter = '';
        let ratingsMinFilter = '';
        
        let usersSearchTerm = '';
        let usersRoleFilter = '';
        let usersStatusFilter = '';
        
        // Initialize data
        function initData() {
            // Initialize users
            const savedUsers = localStorage.getItem('smartEraUsers');
            if (savedUsers) {
                users = JSON.parse(savedUsers);
            } else {
                users = [
                    {
                        id: 1,
                        name: 'المسؤول الرئيسي',
                        email: 'admin@smart-era.com',
                        phone: '+964 123 456 7890',
                        password: 'admin123',
                        role: 'admin',
                        employeeId: null,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        active: true
                    },
                    {
                        id: 2,
                        name: 'أحمد محمد',
                        email: 'ahmed@smart-era.com',
                        phone: '+964 771 123 4567',
                        password: 'ahmed123',
                        role: 'employee',
                        employeeId: 1,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        active: true
                    },
                    {
                        id: 3,
                        name: 'سارة خالد',
                        email: 'sara@smart-era.com',
                        phone: '+964 772 234 5678',
                        password: 'sara123',
                        role: 'manager',
                        employeeId: 2,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        active: true
                    }
                ];
                saveUsers();
            }
            
            // Initialize employees
            const savedEmployees = localStorage.getItem('smartEraEmployees');
            if (savedEmployees) {
                employees = JSON.parse(savedEmployees);
            } else {
                employees = [
                    {
                        id: 1,
                        name: 'أحمد محمد',
                        idNumber: '1234567890',
                        phone: '+964 771 123 4567',
                        email: 'ahmed@smart-era.com',
                        birthDate: '1990-05-15',
                        gender: 'ذكر',
                        familyNumber: '123456',
                        maritalStatus: 'متزوج',
                        position: 'مدير تقنية المعلومات',
                        department: 'التقنية',
                        address: 'بغداد، المنصور',
                        employeeType: 'manager',
                        status: 'active',
                        joinDate: new Date('2020-01-15').toISOString(),
                        salary: 2500000,
                        photo: null
                    },
                    {
                        id: 2,
                        name: 'سارة خالد',
                        idNumber: '0987654321',
                        phone: '+964 772 234 5678',
                        email: 'sara@smart-era.com',
                        birthDate: '1992-08-20',
                        gender: 'أنثى',
                        familyNumber: '654321',
                        maritalStatus: 'أعزب',
                        position: 'مهندسة برمجيات',
                        department: 'التطوير',
                        address: 'بغداد، الكرادة',
                        employeeType: 'regular',
                        status: 'active',
                        joinDate: new Date('2021-03-10').toISOString(),
                        salary: 1800000,
                        photo: null
                    },
                    {
                        id: 3,
                        name: 'محمد علي',
                        idNumber: '1122334455',
                        phone: '+964 773 345 6789',
                        email: 'mohammed@smart-era.com',
                        birthDate: '1985-12-10',
                        gender: 'ذكر',
                        familyNumber: '778899',
                        maritalStatus: 'متزوج',
                        position: 'محاسب',
                        department: 'المالية',
                        address: 'بغداد، الأعظمية',
                        employeeType: 'regular',
                        status: 'active',
                        joinDate: new Date('2019-07-01').toISOString(),
                        salary: 1500000,
                        photo: null
                    }
                ];
                saveEmployees();
            }
            
            // Initialize discounts
            const savedDiscounts = localStorage.getItem('smartEraDiscounts');
            if (savedDiscounts) {
                discounts = JSON.parse(savedDiscounts);
            } else {
                discounts = [
                    {
                        id: 1,
                        employeeId: 1,
                        employeeName: 'أحمد محمد',
                        type: 'تأمين صحي',
                        amount: 50000,
                        month: '2024-01',
                        status: 'مفعل',
                        date: new Date('2024-01-05').toISOString(),
                        notes: 'خصم التأمين الصحي الشهري'
                    },
                    {
                        id: 2,
                        employeeId: 1,
                        employeeName: 'أحمد محمد',
                        type: 'تأمين اجتماعي',
                        amount: 75000,
                        month: '2024-01',
                        status: 'مفعل',
                        date: new Date('2024-01-05').toISOString(),
                        notes: 'خصم التأمين الاجتماعي'
                    },
                    {
                        id: 3,
                        employeeId: 2,
                        employeeName: 'سارة خالد',
                        type: 'تأمين صحي',
                        amount: 50000,
                        month: '2024-01',
                        status: 'مفعل',
                        date: new Date('2024-01-05').toISOString(),
                        notes: 'خصم التأمين الصحي الشهري'
                    },
                    {
                        id: 4,
                        employeeId: 3,
                        employeeName: 'محمد علي',
                        type: 'ضريبة',
                        amount: 100000,
                        month: '2024-01',
                        status: 'مفعل',
                        date: new Date('2024-01-10').toISOString(),
                        notes: 'خصم ضريبة الدخل'
                    }
                ];
                saveDiscounts();
            }
            
            // Initialize contracts
            const savedContracts = localStorage.getItem('smartEraContracts');
            if (savedContracts) {
                contracts = JSON.parse(savedContracts);
            } else {
                contracts = [
                    {
                        id: 1,
                        employeeId: 1,
                        employeeName: 'أحمد محمد',
                        type: 'دائم',
                        startDate: new Date('2020-01-15').toISOString(),
                        endDate: new Date('2025-01-15').toISOString(),
                        salary: 2500000,
                        status: 'نشط',
                        notes: 'عقد عمل دائم'
                    },
                    {
                        id: 2,
                        employeeId: 2,
                        employeeName: 'سارة خالد',
                        type: 'محدد المدة',
                        startDate: new Date('2021-03-10').toISOString(),
                        endDate: new Date('2024-03-10').toISOString(),
                        salary: 1800000,
                        status: 'نشط',
                        notes: 'عقد لمدة 3 سنوات'
                    },
                    {
                        id: 3,
                        employeeId: 3,
                        employeeName: 'محمد علي',
                        type: 'دائم',
                        startDate: new Date('2019-07-01').toISOString(),
                        endDate: new Date('2024-07-01').toISOString(),
                        salary: 1500000,
                        status: 'نشط',
                        notes: 'عقد عمل دائم'
                    }
                ];
                saveContracts();
            }
            
            // Initialize vehicles
            const savedVehicles = localStorage.getItem('smartEraVehicles');
            if (savedVehicles) {
                vehicles = JSON.parse(savedVehicles);
            } else {
                vehicles = [
                    {
                        id: 1,
                        employeeId: 1,
                        employeeName: 'أحمد محمد',
                        plateNumber: 'بغداد 1234',
                        type: 'سيدان',
                        model: 'هافال H6',
                        deliveryDate: new Date('2022-06-01').toISOString(),
                        status: 'مستعملة',
                        notes: 'مركبة مدير القسم'
                    },
                    {
                        id: 2,
                        employeeId: 2,
                        employeeName: 'سارة خالد',
                        plateNumber: 'بغداد 5678',
                        type: 'كروس أوفر',
                        model: 'تويوتا راف 4',
                        deliveryDate: new Date('2023-03-01').toISOString(),
                        status: 'مستعملة',
                        notes: 'مركبة مهندسة'
                    },
                    {
                        id: 3,
                        employeeId: 3,
                        employeeName: 'محمد علي',
                        plateNumber: 'بغداد 9101',
                        type: 'سيدان',
                        model: 'هيونداي النترا',
                        deliveryDate: new Date('2021-08-15').toISOString(),
                        status: 'مستعملة',
                        notes: 'مركبة محاسب'
                    }
                ];
                saveVehicles();
            }
            
            // Initialize ratings
            const savedRatings = localStorage.getItem('smartEraRatings');
            if (savedRatings) {
                ratings = JSON.parse(savedRatings);
            } else {
                ratings = [
                    {
                        id: 1,
                        employeeId: 1,
                        employeeName: 'أحمد محمد',
                        rating: 4.5,
                        date: new Date('2024-01-15').toISOString(),
                        reviewer: 'المدير العام',
                        comment: 'أداء ممتاز، التزام بالعمل',
                        criteria: ['الإنتاجية', 'التعاون', 'الالتزام']
                    },
                    {
                        id: 2,
                        employeeId: 2,
                        employeeName: 'سارة خالد',
                        rating: 4.0,
                        date: new Date('2024-01-10').toISOString(),
                        reviewer: 'رئيس القسم',
                        comment: 'مبدعة في العمل، تحتاج لتحسين مهارات التواصل',
                        criteria: ['الإبداع', 'المهارات التقنية']
                    },
                    {
                        id: 3,
                        employeeId: 3,
                        employeeName: 'محمد علي',
                        rating: 4.2,
                        date: new Date('2024-01-20').toISOString(),
                        reviewer: 'مدير المالية',
                        comment: 'دقيق في العمل، يحتاج لتطوير مهارات القيادة',
                        criteria: ['الدقة', 'المسؤولية']
                    }
                ];
                saveRatings();
            }
            
            // Initialize roles
            const savedRoles = localStorage.getItem('smartEraRoles');
            if (savedRoles) {
                roles = JSON.parse(savedRoles);
            } else {
                roles = [
                    {
                        id: 'admin',
                        name: 'مدير النظام',
                        description: 'صلاحيات كاملة على النظام',
                        permissions: ['all'],
                        users: [1]
                    },
                    {
                        id: 'manager',
                        name: 'مدير قسم',
                        description: 'يمكنه إدارة الموظفين في قسمه',
                        permissions: ['manage_department', 'view_reports'],
                        users: [3]
                    },
                    {
                        id: 'hr',
                        name: 'موارد بشرية',
                        description: 'يمكنه إدارة جميع الموظفين',
                        permissions: ['manage_employees', 'view_reports'],
                        users: []
                    },
                    {
                        id: 'employee',
                        name: 'موظف',
                        description: 'يمكنه مشاهدة بياناته فقط',
                        permissions: ['view_own'],
                        users: [2]
                    },
                    {
                        id: 'guest',
                        name: 'زائر',
                        description: 'يمكنه مشاهدة الصفحات العامة فقط',
                        permissions: ['view_public'],
                        users: []
                    }
                ];
                saveRoles();
            }
            
            // Initialize permissions
            const savedPermissions = localStorage.getItem('smartEraPermissions');
            if (savedPermissions) {
                permissions = JSON.parse(savedPermissions);
            } else {
                permissions = {
                    pages: {
                        home: ['all', 'guest'],
                        about: ['all', 'guest'],
                        jobs: ['all', 'guest'],
                        instructions: ['all', 'guest'],
                        aiChat: ['all', 'guest'],
                        myInfo: ['admin', 'manager', 'hr', 'employee'],
                        employees: ['admin', 'hr', 'manager'],
                        myDiscounts: ['admin', 'manager', 'hr', 'employee'],
                        discounts: ['admin', 'hr', 'manager'],
                        myContract: ['admin', 'manager', 'hr', 'employee'],
                        contracts: ['admin', 'hr', 'manager'],
                        myVehicle: ['admin', 'manager', 'hr', 'employee'],
                        vehicles: ['admin', 'hr', 'manager'],
                        myRatings: ['admin', 'manager', 'hr', 'employee'],
                        ratings: ['admin', 'hr', 'manager'],
                        dashboard: ['admin'],
                        advancedDashboard: ['admin'],
                        users: ['admin'],
                        permissions: ['admin'],
                        reports: ['admin', 'manager', 'hr'],
                        profile: ['admin', 'manager', 'hr', 'employee'],
                        settings: ['admin']
                    },
                    // Action-level permissions (fallbacks used when no per-user override exists)
                    actions: {
                        // format: { create: [...roles], edit: [...roles], delete: [...roles] }
                        users: { create: ['admin'], edit: ['admin'], delete: ['admin'] },
                        employees: { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] },
                        discounts: { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] },
                        contracts: { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] },
                        myInfo: { create: [], edit: ['admin', 'hr', 'manager', 'employee'], delete: [] },
                        vehicles: { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] },
                        ratings: { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] },
                        instructions: { create: ['admin'], edit: ['admin'], delete: ['admin'] }
                    }
                };
                savePermissions();
            }

            // Ensure actions object exists
            if (!permissions.actions) permissions.actions = {};
            if (!permissions.actions.users) permissions.actions.users = { create: ['admin'], edit: ['admin'], delete: ['admin'] };
            if (!permissions.actions.employees) permissions.actions.employees = { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] };
            if (!permissions.actions.discounts) permissions.actions.discounts = { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] };
            if (!permissions.actions.contracts) permissions.actions.contracts = { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] };
            if (!permissions.actions.myInfo) permissions.actions.myInfo = { create: [], edit: ['admin', 'hr', 'manager', 'employee'], delete: [] };
            if (!permissions.actions.vehicles) permissions.actions.vehicles = { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] };
            if (!permissions.actions.ratings) permissions.actions.ratings = { create: ['admin', 'hr', 'manager'], edit: ['admin', 'hr', 'manager'], delete: ['admin', 'hr', 'manager'] };
            if (!permissions.actions.instructions) permissions.actions.instructions = { create: ['admin'], edit: ['admin'], delete: ['admin'] };

            // Initialize per-user permissions overrides
            const savedUserPerms = localStorage.getItem('smartEraUserPermissions');
            if (savedUserPerms) {
                userPermissions = JSON.parse(savedUserPerms);
            } else {
                userPermissions = {};
                localStorage.setItem('smartEraUserPermissions', JSON.stringify(userPermissions));
            }

            // Ensure newly added pages exist in saved permissions
            if (!permissions.pages) permissions.pages = {};
            if (!permissions.pages.instructions) permissions.pages.instructions = ['all', 'guest'];
            if (!permissions.pages.aiChat) permissions.pages.aiChat = ['all', 'guest'];
            if (!permissions.pages.messages) permissions.pages.messages = ['all'];
            savePermissions();

            // Initialize company instructions pages
            const savedInstructions = localStorage.getItem('smartEraInstructions');
            if (savedInstructions) {
                instructionPages = JSON.parse(savedInstructions);
            } else {
                instructionPages = [
                    {
                        id: 1,
                        title: 'مقدمة',
                        content: '<p>هنا يمكنك كتابة تعليمات الشركة وسياساتها. يمكنك إضافة صفحات متعددة من داخل هذه الصفحة.</p>'
                    },
                    {
                        id: 2,
                        title: 'الدوام والانضباط',
                        content: '<ul><li>الالتزام بأوقات الدوام.</li><li>إبلاغ الإدارة عند التأخير أو الغياب.</li></ul>'
                    }
                ];
                saveInstructions();
            }
            
            // Initialize activity log
            const savedActivityLog = localStorage.getItem('smartEraActivityLog');
            if (savedActivityLog) {
                activityLog = JSON.parse(savedActivityLog);
            } else {
                activityLog = [
                    {
                        id: 1,
                        userId: 1,
                        userName: 'المسؤول الرئيسي',
                        action: 'تسجيل دخول',
                        details: 'تسجيل دخول المسؤول الرئيسي',
                        page: 'login',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 2,
                        userId: 1,
                        userName: 'المسؤول الرئيسي',
                        action: 'إضافة موظف',
                        details: 'تم إضافة الموظف: أحمد محمد',
                        page: 'employees',
                        timestamp: new Date(Date.now() - 3600000).toISOString()
                    }
                ];
                saveActivityLog();
            }
            
            // Initialize content edits
            const savedContentEdits = localStorage.getItem('smartEraContentEdits');
            if (savedContentEdits) {
                contentEdits = JSON.parse(savedContentEdits);
            } else {
                contentEdits = [
                    {
                        id: 1,
                        elementId: 'homeTitle',
                        oldValue: 'مرحباً بك في نظامنا',
                        newValue: 'نظام إدارة الموظفين المتكامل',
                        userId: 1,
                        userName: 'المسؤول الرئيسي',
                        page: 'home',
                        timestamp: new Date(Date.now() - 7200000).toISOString()
                    }
                ];
                saveContentEdits();
            }
            
            // Initialize available jobs
            const savedJobs = localStorage.getItem('smartEraJobs');
            if (savedJobs) {
                availableJobs = JSON.parse(savedJobs);
            } else {
                availableJobs = [
                    {
                        id: 1,
                        title: 'مهندس برمجيات',
                        department: 'التطوير',
                        type: 'دوام كامل',
                        location: 'بغداد',
                        description: 'نبحث عن مهندس برمجيات مبدع للانضمام لفريق التطوير لدينا.',
                        requirements: ['خبرة 3+ سنوات', 'معرفة بلغات البرمجة', 'مهارات حل المشكلات'],
                        salary: 'تنافسي',
                        status: 'مفتوحة',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        title: 'مصمم جرافيك',
                        department: 'التسويق',
                        type: 'دوام جزئي',
                        location: 'عن بُعد',
                        description: 'نبحث عن مصمم جرافيك مبدع للانضمام لفريق التسويق.',
                        requirements: ['خبرة 2+ سنوات', 'إتقان برامج التصميم', 'القدرة على العمل ضمن فريق'],
                        salary: 'حسب الخبرة',
                        status: 'مفتوحة',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 3,
                        title: 'محاسب',
                        department: 'المالية',
                        type: 'دوام كامل',
                        location: 'بغداد',
                        description: 'نبحث عن محاسب متميز للانضمام لفريق المالية.',
                        requirements: ['خبرة 4+ سنوات', 'شهادة محاسبة', 'معرفة بالبرامج المحاسبية'],
                        salary: 'جيد',
                        status: 'مفتوحة',
                        createdAt: new Date().toISOString()
                    }
                ];
                saveJobs();
            }
            
            // Load saved settings
            const savedSettings = localStorage.getItem('smartEraSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                currencySymbol = settings.currency || 'IQD';
            }
        }
        
        // Save data functions
        function saveUsers() {
            localStorage.setItem('smartEraUsers', JSON.stringify(users));
        }
        
        function saveEmployees() {
            localStorage.setItem('smartEraEmployees', JSON.stringify(employees));
        }
        
        function saveDiscounts() {
            localStorage.setItem('smartEraDiscounts', JSON.stringify(discounts));
        }
        
        function saveContracts() {
            localStorage.setItem('smartEraContracts', JSON.stringify(contracts));
        }
        
        function saveVehicles() {
            localStorage.setItem('smartEraVehicles', JSON.stringify(vehicles));
        }
        
        function saveRatings() {
            localStorage.setItem('smartEraRatings', JSON.stringify(ratings));
        }
        
        function saveRoles() {
            localStorage.setItem('smartEraRoles', JSON.stringify(roles));
        }
        
        function savePermissions() {
            localStorage.setItem('smartEraPermissions', JSON.stringify(permissions));
        }

        function saveUserPermissions() {
            localStorage.setItem('smartEraUserPermissions', JSON.stringify(userPermissions));
        }
        
        function saveSettings() {
            const settings = {
                currency: currencySymbol,
                companyName: document.getElementById('companyName')?.value || 'شركة العصر الذكي',
                language: document.getElementById('defaultLanguage')?.value || 'ar'
            };
            localStorage.setItem('smartEraSettings', JSON.stringify(settings));
        }
        
        function saveActivityLog() {
            localStorage.setItem('smartEraActivityLog', JSON.stringify(activityLog));
        }
        
        function saveContentEdits() {
            localStorage.setItem('smartEraContentEdits', JSON.stringify(contentEdits));
        }
        
        function saveJobs() {
            localStorage.setItem('smartEraJobs', JSON.stringify(availableJobs));
        }

        function saveInstructions() {
            localStorage.setItem('smartEraInstructions', JSON.stringify(instructionPages));
        }
        
        // Load site content
        function loadContent() {
            const content = localStorage.getItem('smartEraContent');
            if (content) {
                const data = JSON.parse(content);
                for (const [key, value] of Object.entries(data)) {
                    const element = document.querySelector(`[data-id="${key}"]`);
                    if (element) {
                        element.textContent = value;
                    }
                }
            }
        }
        
        // Save site content
        function saveContent() {
            const data = {};
            document.querySelectorAll('.editable').forEach(element => {
                const id = element.getAttribute('data-id');
                if (id) {
                    data[id] = element.textContent;
                }
            });
            localStorage.setItem('smartEraContent', JSON.stringify(data));
            
            // Log content edit
            logActivity('تعديل محتوى', 'تم حفظ المحتوى');
            
            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم حفظ المحتوى بنجاح',
                timer: 1500,
                showConfirmButton: false
            });
        }
        
        // Log activity function
        function logActivity(action, details, page = null) {
            const activity = {
                id: activityLog.length > 0 ? Math.max(...activityLog.map(a => a.id)) + 1 : 1,
                userId: currentUser ? currentUser.id : 0,
                userName: currentUser ? currentUser.name : 'زائر',
                action: action,
                details: details,
                page: page || currentPage,
                timestamp: new Date().toISOString()
            };
            
            activityLog.unshift(activity);
            saveActivityLog();
        }
        
        // Log content edit
        function logContentEdit(elementId, oldValue, newValue) {
            const edit = {
                id: contentEdits.length > 0 ? Math.max(...contentEdits.map(c => c.id)) + 1 : 1,
                elementId: elementId,
                oldValue: oldValue,
                newValue: newValue,
                userId: currentUser ? currentUser.id : 0,
                userName: currentUser ? currentUser.name : 'زائر',
                page: currentPage,
                timestamp: new Date().toISOString()
            };
            
            contentEdits.unshift(edit);
            saveContentEdits();
            
            logActivity('تعديل محتوى', `تم تعديل ${elementId} من "${oldValue}" إلى "${newValue}"`);
        }
        
        // Check authentication on page load
        function checkAuth() {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                showMainApp();
            } else {
                // Show guest view
                document.getElementById('loginPage').style.display = 'flex';
                document.getElementById('mainApp').style.display = 'block';
                currentUser = null;
                updateUIForUser();
                // Visitors see only About/Jobs
                showPage('about');
            }
        }
        
        // Show main application
        function showMainApp() {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';

            // Ensure theme icon matches the current saved theme
            try { initTheme(); } catch (_) {}
            
            // Update UI based on user role
            updateUIForUser();
            
            // Load content
            loadContent();
            
            // Apply permissions
            applyPermissions();

            // Update message badge + notify if there are new messages
            try{ loadMessages(); }catch(_){ }
            
            // Default page after login
            if (currentUser && currentUser.role === 'guest') {
                showPage('about');
            } else {
                showPage('home');
            }
            
            // Log login activity
            if (currentUser) {
                logActivity('تسجيل دخول', `تسجيل دخول ${currentUser.name}`);
            }
        }
        
        // Update UI based on user role
        function updateUIForUser() {
            if (currentUser) {
                // Update user avatar
                const avatar = document.getElementById('userAvatar');
                const initials = (currentUser.name||currentUser.email||'U').split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase();
                // If the user has a saved avatar image, use it (shared with profile + messaging)
                if(currentUser.avatar){
                    avatar.textContent = '';
                    avatar.style.background = 'transparent';
                    avatar.style.backgroundImage = `url(${currentUser.avatar})`;
                    avatar.style.backgroundSize = 'cover';
                    avatar.style.backgroundPosition = 'center';
                }else{
                    avatar.textContent = initials;
                    avatar.style.backgroundImage = '';
                    avatar.style.background = getGradientForUser(currentUser.id);
                }
                
                // Update profile page
                document.getElementById('profileName').textContent = currentUser.name;
                document.getElementById('profileEmail').textContent = currentUser.email;
                document.getElementById('profileNameInput').value = currentUser.name;
                document.getElementById('profileEmailInput').value = currentUser.email;
                document.getElementById('profilePhoneInput').value = currentUser.phone || '';
                
                // Update profile avatar
                const profileAvatar = document.getElementById('profileAvatar');
                if(profileAvatar){
                    if(currentUser.avatar){
                        profileAvatar.textContent='';
                        profileAvatar.style.background='transparent';
                        profileAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
                        profileAvatar.style.backgroundSize = 'cover';
                        profileAvatar.style.backgroundPosition = 'center';
                    }else{
                        profileAvatar.textContent = initials;
                        profileAvatar.style.backgroundImage='';
                        profileAvatar.style.background = getGradientForUser(currentUser.id);
                    }
                }
                
                // Update role badge
                const badge = document.getElementById('profileRoleBadge');
                const role = roles.find(r => r.id === currentUser.role);
                badge.textContent = role ? role.name : getRoleName(currentUser.role);
                badge.className = `employee-type-badge type-${currentUser.role === 'admin' ? 'admin' : currentUser.role === 'hr' ? 'hr' : currentUser.role}`;
            }
            
            // Hide/show elements based on user type
            const isGuest = !currentUser || (currentUser && currentUser.role === 'guest');
            document.querySelectorAll('.user-only').forEach(el => {
                // keep user dropdown visible for logged-in guests; other user-only sections stay hidden
                if (el.classList.contains('user-dropdown')) {
                    el.style.display = currentUser ? '' : 'none';
                } else {
                    el.style.display = isGuest ? 'none' : '';
                }
            });
            document.querySelectorAll('.guest-only').forEach(el => {
                el.style.display = isGuest ? '' : 'none';
            });
        }
        
        // Get gradient color for user
        function getGradientForUser(userId) {
            const colors = [
                'linear-gradient(135deg, #8E0C49, #CC212F)',
                'linear-gradient(135deg, #983B6F, #8E0C49)',
                'linear-gradient(135deg, #CC212F, #FF980E)',
                'linear-gradient(135deg, #8E0C49, #FF980E)',
                'linear-gradient(135deg, #CC212F, #983B6F)'
            ];
            return colors[userId % colors.length];
        }
        
        // Get role name in Arabic
        function getRoleName(role) {
            switch (role) {
                case 'admin': return 'مدير النظام';
                case 'manager': return 'مدير قسم';
                case 'hr': return 'موارد بشرية';
                case 'employee': return 'موظف';
                case 'guest': return 'زائر';
                default: return 'غير محدد';
            }

            // Update message badge in navbar
            try{ updateMessageBadge(); }catch(_){ }
        }
        
        // Apply permissions to UI
        function applyPermissions() {
            // First: keep the original guest/user segregation
            const isGuest = !currentUser || (currentUser && currentUser.role === 'guest');
            document.querySelectorAll('.user-only').forEach(el => {
                if (el.classList.contains('user-dropdown')) {
                    el.style.display = currentUser ? '' : 'none';
                } else {
                    el.style.display = isGuest ? 'none' : '';
                }
            });
            document.querySelectorAll('.guest-only').forEach(el => {
                el.style.display = isGuest ? '' : 'none';
            });

            // Then: apply per-page permissions to navigation links (navbar links + dropdown items)
            document.querySelectorAll('a[onclick*="showPage("]').forEach(link => {
                const onclick = link.getAttribute('onclick') || '';
                const m = onclick.match(/showPage\('([^']+)'\)/);
                if (!m) return;

                const pageId = m[1];

                // Hide the nearest <li> (dropdown item) or fall back to the link itself
                const li = link.closest('li');
                const target = li || link;

                target.style.display = hasPermission(pageId, 'view') ? '' : 'none';
            });
        }
        
        // Login function
        function setLoginInlineAlert(type, message) {
            try {
                const el = document.getElementById('loginInlineAlert');
                if (!el) return;
                if (!message) {
                    el.style.display = 'none';
                    el.className = 'alert';
                    el.textContent = '';
                    return;
                }
                el.className = `alert alert-${type || 'danger'}`;
                el.textContent = message;
                el.style.display = 'block';
            } catch (_) {}
        }

        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            // Clear any previous inline messages
            setLoginInlineAlert(null, '');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Find user (with admin backward-compat for default password)
            const userByEmail = users.find(u => u.email === email && u.active === true);
            const user = (() => {
                if (!userByEmail) return null;

                // Normal password match
                if (userByEmail.password === password) return userByEmail;

                // Admin: accept both legacy and new default password, and auto-upgrade to the new one on success
                const isAdmin = userByEmail.role === 'admin' && userByEmail.email === 'admin@smart-era.com';
                if (!isAdmin) return null;

                const legacy = 'admin123';
                const standard = 'Admin@123';
                const ok = (userByEmail.password === legacy && password === standard) ||
                           (userByEmail.password === standard && password === legacy);
                if (!ok) return null;

                // Upgrade stored password to the standard one
                userByEmail.password = standard;
                saveUsers();
                return userByEmail;
            })();
            
            if (user) {
                // Remember email (optional)
                try {
                    const remember = document.getElementById('rememberMe');
                    if (remember && remember.checked) {
                        localStorage.setItem('rememberEmail', email);
                    } else {
                        localStorage.removeItem('rememberEmail');
                    }
                } catch (_) {}

                // Update last login
                user.lastLogin = new Date().toISOString();
                saveUsers();
                
                currentUser = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    employeeId: user.employeeId,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                };
                
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // Optional: login to realtime server (for live chat/notifications)
                try {
                    const srvUser = await serverLogin(email, password);
                    if (srvUser && typeof srvUser === 'object') {
                        // Sync avatar/status into local currentUser for UI
                        currentUser.avatar = srvUser.avatar || currentUser.avatar || null;
                        currentUser.status = srvUser.status || currentUser.status || 'متاح';
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    connectSocket();
                } catch (err) {
                    // Server is optional; app can run without it.
                    console.warn('Realtime server login failed:', err?.message || err);
                }
                showMainApp();

                setLoginInlineAlert('success', `تم تسجيل الدخول بنجاح. أهلاً ${user.name}`);
                
                Swal.fire({
                    icon: 'success',
                    title: 'تم تسجيل الدخول',
                    text: `مرحباً ${user.name}`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                setLoginInlineAlert('danger', 'البريد الإلكتروني أو كلمة المرور غير صحيحة أو الحساب غير مفعل');
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'البريد الإلكتروني أو كلمة المرور غير صحيحة أو الحساب غير مفعل'
                });
            }
        });

        // Toggle password visibility (Login UI)
        function togglePassword() {
            const pass = document.getElementById('loginPassword');
            if (!pass) return;
            pass.type = pass.type === 'password' ? 'text' : 'password';
            const icon = document.querySelector('.password-toggle i');
            if (icon) {
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        }

        // Load remembered email
        document.addEventListener('DOMContentLoaded', function () {
            // Apply saved theme early
            try { initTheme(); } catch (_) {}
            try {
                const saved = localStorage.getItem('rememberEmail');
                const emailInput = document.getElementById('loginEmail');
                const remember = document.getElementById('rememberMe');
                if (saved && emailInput) {
                    emailInput.value = saved;
                    if (remember) remember.checked = true;
                }
            } catch (_) {}
        });

        /* -------------------------------------------------------------------------- */
        /*                         Google Sign-In (Public)                            */
        /* -------------------------------------------------------------------------- */

        // ضع Client ID مال Google Identity Services هنا
        // شلون تجيبه: Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID (Web)
        const GOOGLE_CLIENT_ID = 'REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

        function initGoogleSignIn() {
            const box = document.getElementById('googleSignInBox');
            if (!box) return;

            // If user didn't set Client ID yet, show helpful note instead of failing silently
            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID')) {
                box.innerHTML = `
                  <button type="button" class="btn btn-outline-secondary w-100" onclick="Swal.fire({icon:'info',title:'Google Client ID',text:'لازم تحط GOOGLE_CLIENT_ID داخل public/assets/js/app.js حتى يشتغل تسجيل الدخول بالكوكل.'})">
                    <i class="bi bi-google"></i> تسجيل الدخول بالكوكل
                  </button>
                `;
                return;
            }

            // Wait for google script to be ready
            if (!window.google || !google.accounts || !google.accounts.id) {
                setTimeout(initGoogleSignIn, 250);
                return;
            }

            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            // Render a standard button
            google.accounts.id.renderButton(box, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: 320
            });
        }

        // Decode JWT payload (base64url)
        function decodeJwtPayload(token) {
            try {
                const payload = token.split('.')[1];
                const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                return JSON.parse(jsonPayload);
            } catch (e) {
                return null;
            }
        }

        function handleGoogleCredential(response) {
            try {
                // Clear any previous inline messages
                setLoginInlineAlert(null, '');

                const payload = decodeJwtPayload(response.credential);
                if (!payload || !payload.email) {
                    setLoginInlineAlert('danger', 'فشل تسجيل الدخول: ما قدرنا نقرأ معلومات حساب Google.');
                    Swal.fire({ icon: 'error', title: 'فشل تسجيل الدخول', text: 'ما قدرنا نقرأ معلومات حساب Google.' });
                    return;
                }

            const email = String(payload.email).toLowerCase();
            const name = payload.name || payload.given_name || email.split('@')[0];

            // If admin already created this user -> use his role/permissions
            let user = users.find(u => (u.email || '').toLowerCase() === email);

            if (user && user.active === false) {
                setLoginInlineAlert('danger', 'هذا الحساب موجود لكن غير مفعل من قبل الإدارة.');
                Swal.fire({ icon: 'error', title: 'الحساب غير مفعل', text: 'هذا الحساب موجود لكن غير مفعل من قبل الإدارة.' });
                return;
            }

            // Create a new guest user if not found
            if (!user) {
                const newId = users.length ? Math.max(...users.map(u => u.id || 0)) + 1 : 1;
                user = {
                    id: newId,
                    name,
                    email,
                    phone: '',
                    password: null,
                    role: 'guest',
                    employeeId: null,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    active: true,
                    provider: 'google'
                };
                users.push(user);
                saveUsers();
            }

            // Update last login
            user.lastLogin = new Date().toISOString();
            saveUsers();

            currentUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role || 'guest',
                employeeId: user.employeeId,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainApp();

            setLoginInlineAlert('success', `تم تسجيل الدخول بنجاح. أهلاً ${user.name}`);

            Swal.fire({
                icon: 'success',
                title: 'تم تسجيل الدخول',
                text: `مرحباً ${user.name}`,
                timer: 1400,
                showConfirmButton: false
            });
            } catch (err) {
                console.error('Google login error', err);
                setLoginInlineAlert('danger', 'صار خطأ أثناء تسجيل الدخول بالكوكل. جرّب مرة ثانية.');
                Swal.fire({ icon: 'error', title: 'خطأ', text: 'صار خطأ أثناء تسجيل الدخول بالكوكل. جرّب مرة ثانية.' });
            }
        }
        
        // Redirect to WhatsApp for registration
        function redirectToWhatsApp() {
            const message = encodeURIComponent('أرغب في إنشاء حساب جديد في نظام إدارة الموظفين\nالاسم:\nالوظيفة:\nرقم الهاتف:');
            window.open(`https://wa.me/07838737309?text=${message}`, '_blank');
        }
        
        // Logout function
        async function logout() {
            // Log logout activity
            if (currentUser) {
                logActivity('تسجيل خروج', `تسجيل خروج ${currentUser.name}`);
            }
            
            currentUser = null;
            localStorage.removeItem('currentUser');

            try { await serverLogout(); } catch (_) {}
            try { if (socket) { socket.disconnect(); socket = null; } } catch (_) {}
            
            document.getElementById('mainApp').style.display = 'none';
            document.getElementById('loginPage').style.display = 'flex';
            
            // Reset forms
            document.getElementById('loginForm').reset();
            
            Swal.fire({
                icon: 'success',
                title: 'تم تسجيل الخروج',
                timer: 1500,
                showConfirmButton: false
            });
        }
        
        // Show page function
        function showPage(pageId) {
            // Check permissions
            if (!hasPagePermission(pageId)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'غير مسموح',
                    text: 'ليس لديك صلاحية الوصول إلى هذه الصفحة'
                });
                return;
            }
            
            // Hide all pages
            document.querySelectorAll('.page-container').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
            const pageElement = document.getElementById(`${pageId}Page`);
            if (pageElement) {
                pageElement.classList.add('active');
                currentPage = pageId;
                
                // Update active nav link (supports dropdown items)
                document.querySelectorAll('.nav-link, .dropdown-item').forEach(link => {
                    link.classList.remove('active');
                });

                const matchLinks = document.querySelectorAll(`a[onclick*="showPage('${pageId}')"]`);
                matchLinks.forEach(link => {
                    link.classList.add('active');

                    // If it's inside a dropdown, also highlight the dropdown toggle
                    const dd = link.closest('.dropdown');
                    if (dd) {
                        const toggle = dd.querySelector('.dropdown-toggle');
                        if (toggle) toggle.classList.add('active');
                    }
                });
                
                // Scroll to top
                window.scrollTo(0, 0);
                
                // Load page data
                loadPageData(pageId);
                
                // Log page view
                logActivity('زيارة صفحة', `زيارة صفحة ${pageId}`, pageId);

                // UI polish (responsive tables etc.)
                enhancePageUI(pageElement);
            }
        }


        // UI helpers: make tables mobile-friendly automatically
        function enhancePageUI(rootEl){
            try{
                if(!rootEl) return;
                const tables = rootEl.querySelectorAll('table.table');
                tables.forEach(tbl=>{
                    const parent = tbl.parentElement;
                    if(parent && parent.classList && parent.classList.contains('table-responsive')) return;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'table-responsive';
                    tbl.parentNode.insertBefore(wrapper, tbl);
                    wrapper.appendChild(tbl);
                });
            }catch(e){
                // no-op: never break the app UI
                console.warn('enhancePageUI failed', e);
            }
        }

        
        // Check permissions (page visibility + actions). Per-user overrides take priority.
        function hasPermission(pageId, action = 'view') {
            // Guests (including Google sign-ins) can only view: About + Jobs
            const guestPages = ['about', 'jobs'];

            // Visitors OR logged-in "guest" users
            if (!currentUser || currentUser.role === 'guest') {
                return action === 'view' ? guestPages.includes(pageId) : false;
            }

            // Admin fallback: allow everything unless explicitly overridden off
            const userOverride = userPermissions?.[currentUser.id]?.pages?.[pageId];
            if (userOverride) {
                if (typeof userOverride[action] === 'boolean') return userOverride[action];
            }

            if (action === 'view') {
                const allowedRoles = permissions?.pages?.[pageId];
                if (!allowedRoles) return true;
                return allowedRoles.includes('all') || allowedRoles.includes(currentUser.role);
            }

            // Action-level fallback (create/edit/delete)
            if (currentUser.role === 'admin') {
                // Admin is allowed by default for actions
                return true;
            }
            const actionRoles = permissions?.actions?.[pageId]?.[action];
            if (!actionRoles) return false;
            return actionRoles.includes(currentUser.role) || actionRoles.includes('all');
        }

        // Backwards compatibility
        function hasPagePermission(pageId) {
            return hasPermission(pageId, 'view');
        }
        
        // Load page data
        function loadPageData(pageId) {
            switch (pageId) {
                case 'home':
                    break;
                case 'about':
                    break;
                case 'jobs':
                    loadJobsPage();
                    break;
                case 'instructions':
                    loadInstructionsPage();
                    break;
                case 'aiChat':
                    loadAiChatHistory();
                    renderAiChat();
                    break;
                case 'myInfo':
                    loadMyInfo();
                    break;
                case 'employees':
                    loadEmployees();
                    setupEmployeeSearch();
                    break;
                case 'myDiscounts':
                    loadMyDiscounts();
                    setupMyDiscountsSearch();
                    break;
                case 'discounts':
                    loadDiscounts();
                    setupDiscountsSearch();
                    break;
                case 'myContract':
                    loadMyContract();
                    break;
                case 'contracts':
                    loadContracts();
                    setupContractsSearch();
                    break;
                case 'myVehicle':
                    loadMyVehicle();
                    break;
                case 'vehicles':
                    loadVehicles();
                    setupVehiclesSearch();
                    break;
                case 'myRatings':
                    loadMyRatings();
                    setupMyRatingsSearch();
                    break;
                case 'ratings':
                    loadRatings();
                    setupRatingsSearch();
                    break;
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'advancedDashboard':
                    loadAdvancedDashboard();
                    break;
                case 'users':
                    loadUsersTable();
                    setupUsersSearch();
                    break;
                case 'permissions':
                    loadRoles();
                    loadPagesPermissions();
                    loadUserPermissionsManager();
                    break;
                case 'reports':
                    loadReports();
                    break;
                case 'profile':
                    loadProfile();
                    break;
                                case 'messages':
                    loadMessages();
                    break;
case 'settings':
                    loadSettings();
                    break;
            }
        }
        
        // Setup search functionality for employees
        function setupEmployeeSearch() {
            const searchInput = document.getElementById('employeeSearch');
            const statusFilter = document.getElementById('employeeStatusFilter');
            const filterButtons = document.querySelectorAll('#employeesPage .filter-btn');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    employeeSearchTerm = this.value.toLowerCase();
                    currentEmployeePage = 1;
                    loadEmployees();
                });
            }
            
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    employeeStatusFilter = this.value;
                    currentEmployeePage = 1;
                    loadEmployees();
                });
            }
            
            filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                    employeeTypeFilter = this.getAttribute('data-filter');
                    currentEmployeePage = 1;
                    loadEmployees();
                });
            });
        }
        
        // Setup search functionality for my discounts
        function setupMyDiscountsSearch() {
            const searchInput = document.getElementById('myDiscountsSearch');
            const yearFilter = document.getElementById('myDiscountsYearFilter');
            const statusFilter = document.getElementById('myDiscountsStatusFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    myDiscountsSearchTerm = this.value.toLowerCase();
                    currentMyDiscountPage = 1;
                    loadMyDiscounts();
                });
            }
            
            if (yearFilter) {
                yearFilter.addEventListener('change', function() {
                    myDiscountsYearFilter = this.value;
                    currentMyDiscountPage = 1;
                    loadMyDiscounts();
                });
            }
            
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    myDiscountsStatusFilter = this.value;
                    currentMyDiscountPage = 1;
                    loadMyDiscounts();
                });
            }
        }
        
        // Setup search functionality for discounts
        function setupDiscountsSearch() {
            const searchInput = document.getElementById('discountsSearch');
            const monthFilter = document.getElementById('discountsMonthFilter');
            const statusFilter = document.getElementById('discountsStatusFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    discountsSearchTerm = this.value.toLowerCase();
                    currentDiscountPage = 1;
                    loadDiscounts();
                });
            }
            
            if (monthFilter) {
                monthFilter.addEventListener('change', function() {
                    discountsMonthFilter = this.value;
                    currentDiscountPage = 1;
                    loadDiscounts();
                });
            }
            
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    discountsStatusFilter = this.value;
                    currentDiscountPage = 1;
                    loadDiscounts();
                });
            }
        }
        
        // Setup search functionality for contracts
        function setupContractsSearch() {
            const searchInput = document.getElementById('contractsSearch');
            const typeFilter = document.getElementById('contractsTypeFilter');
            const statusFilter = document.getElementById('contractsStatusFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    contractsSearchTerm = this.value.toLowerCase();
                    currentContractPage = 1;
                    loadContracts();
                });
            }
            
            if (typeFilter) {
                typeFilter.addEventListener('change', function() {
                    contractsTypeFilter = this.value;
                    currentContractPage = 1;
                    loadContracts();
                });
            }
            
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    contractsStatusFilter = this.value;
                    currentContractPage = 1;
                    loadContracts();
                });
            }
        }
        
        // Setup search functionality for vehicles
        function setupVehiclesSearch() {
            const searchInput = document.getElementById('vehiclesSearch');
            const typeFilter = document.getElementById('vehiclesTypeFilter');
            const statusFilter = document.getElementById('vehiclesStatusFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    vehiclesSearchTerm = this.value.toLowerCase();
                    currentVehiclePage = 1;
                    loadVehicles();
                });
            }
            
            if (typeFilter) {
                typeFilter.addEventListener('change', function() {
                    vehiclesTypeFilter = this.value;
                    currentVehiclePage = 1;
                    loadVehicles();
                });
            }
            
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    vehiclesStatusFilter = this.value;
                    currentVehiclePage = 1;
                    loadVehicles();
                });
            }
        }

        /* -------------------------------------------------------------------------- */
        /*                                 Discounts                                  */
        /* -------------------------------------------------------------------------- */

        function showAddDiscountModal() {
            if (!hasPermission('discounts', 'create')) {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'ليس لديك صلاحية إضافة خصم' });
                return;
            }

            document.getElementById('discountModalTitle').textContent = 'إضافة خصم جديد';
            document.getElementById('discountEditId').value = '';
            document.getElementById('addDiscountForm')?.reset();

            const employeeSelect = document.getElementById('discountEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' +
                    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
            }

            const modal = new bootstrap.Modal(document.getElementById('addDiscountModal'));
            modal.show();
        }

        function editDiscount(discountId) {
            if (!hasPermission('discounts', 'edit')) return;
            const d = discounts.find(x => x.id === discountId);
            if (!d) return;

            document.getElementById('discountModalTitle').textContent = 'تعديل الخصم';
            document.getElementById('discountEditId').value = d.id;

            const employeeSelect = document.getElementById('discountEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' +
                    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
                employeeSelect.value = d.employeeId || '';
            }

            document.getElementById('discountType').value = d.type || 'أخرى';
            document.getElementById('discountAmount').value = d.amount || 0;
            document.getElementById('discountMonth').value = d.month || '';
            document.getElementById('discountStatus').value = d.status || 'مفعل';
            document.getElementById('discountNotes').value = d.notes || '';

            const modal = new bootstrap.Modal(document.getElementById('addDiscountModal'));
            modal.show();
        }

        function saveDiscount() {
            const editId = document.getElementById('discountEditId').value;
            const employeeIdVal = document.getElementById('discountEmployeeId').value;
            const type = document.getElementById('discountType').value;
            const amount = parseFloat(document.getElementById('discountAmount').value || '0');
            const month = document.getElementById('discountMonth').value;
            const status = document.getElementById('discountStatus').value;
            const notes = (document.getElementById('discountNotes').value || '').trim();

            const isEdit = !!editId;
            if (isEdit && !hasPermission('discounts', 'edit')) return;
            if (!isEdit && !hasPermission('discounts', 'create')) return;

            if (!employeeIdVal || !type || !month || isNaN(amount) || amount <= 0) {
                Swal.fire({ icon: 'warning', title: 'نقص بالبيانات', text: 'يرجى اختيار الموظف وإدخال نوع الخصم والمبلغ والشهر' });
                return;
            }

            const employeeId = parseInt(employeeIdVal, 10);
            const emp = employees.find(e => e.id === employeeId);
            const employeeName = emp ? emp.name : '';

            if (isEdit) {
                const idx = discounts.findIndex(x => String(x.id) === String(editId));
                if (idx === -1) return;
                discounts[idx] = { ...discounts[idx], employeeId, employeeName, type, amount, month, status, notes };
                logActivity('تعديل خصم', `تم تعديل خصم للموظف: ${employeeName}`, 'discounts');
            } else {
                const newId = discounts.length ? Math.max(...discounts.map(x => x.id)) + 1 : 1;
                discounts.push({
                    id: newId,
                    employeeId,
                    employeeName,
                    type,
                    amount,
                    month,
                    status,
                    date: new Date().toISOString(),
                    notes
                });
                logActivity('إضافة خصم', `تم إضافة خصم للموظف: ${employeeName}`, 'discounts');
            }

            saveDiscounts();
            loadDiscounts();
            loadMyDiscounts();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addDiscountModal'));
            if (modal) modal.hide();
            Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1200, showConfirmButton: false });
        }

        function deleteDiscount(discountId) {
            if (!hasPermission('discounts', 'delete')) return;
            const d = discounts.find(x => x.id === discountId);
            if (!d) return;
            Swal.fire({
                icon: 'warning',
                title: 'تأكيد الحذف',
                text: 'هل أنت متأكد من حذف هذا الخصم؟',
                showCancelButton: true,
                confirmButtonText: 'حذف',
                cancelButtonText: 'إلغاء'
            }).then(res => {
                if (!res.isConfirmed) return;
                discounts = discounts.filter(x => x.id !== discountId);
                saveDiscounts();
                loadDiscounts();
                loadMyDiscounts();
                logActivity('حذف خصم', `تم حذف خصم (${d.employeeName})`, 'discounts');
            });
        }

        function loadDiscounts() {
            const tbody = document.getElementById('discountsTableBody');
            const paginationEl = document.getElementById('discountsPagination');
            if (!tbody) return;

            const addBtn = document.querySelector("#discountsPage button[onclick=\"showAddDiscountModal()\"]");
            if (addBtn) addBtn.style.display = hasPermission('discounts', 'create') ? '' : 'none';

            let filtered = [...discounts];
            if (discountsSearchTerm) {
                filtered = filtered.filter(d =>
                    (d.employeeName || '').toLowerCase().includes(discountsSearchTerm) ||
                    (d.type || '').toLowerCase().includes(discountsSearchTerm)
                );
            }
            if (discountsMonthFilter) {
                filtered = filtered.filter(d => String(d.month || '') === String(discountsMonthFilter));
            }
            if (discountsStatusFilter) {
                filtered = filtered.filter(d => d.status === discountsStatusFilter);
            }

            filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            currentDiscountPage = Math.min(currentDiscountPage, totalPages);
            const start = (currentDiscountPage - 1) * itemsPerPage;
            const pageItems = filtered.slice(start, start + itemsPerPage);

            const canEdit = hasPermission('discounts', 'edit');
            const canDelete = hasPermission('discounts', 'delete');

            tbody.innerHTML = pageItems.map(d => {
                const statusBadge = d.status === 'مفعل'
                    ? '<span class="status-badge status-active">مفعل</span>'
                    : (d.status === 'ملغى'
                        ? '<span class="status-badge status-inactive">ملغى</span>'
                        : '<span class="status-badge status-pending">معلق</span>');
                return `
                    <tr>
                        <td>${d.id}</td>
                        <td>${escapeHtml(d.employeeName || '')}</td>
                        <td>${escapeHtml(d.type || '')}</td>
                        <td>${formatCurrency(d.amount || 0)}</td>
                        <td>${escapeHtml(d.month || '')}</td>
                        <td>${statusBadge}</td>
                        <td>${formatDate(d.date)}</td>
                        <td>
                            <div class="d-flex gap-2 flex-wrap">
                                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="editDiscount(${d.id})"><i class="bi bi-pencil"></i></button>` : ''}
                                ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="deleteDiscount(${d.id})"><i class="bi bi-trash"></i></button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentDiscountPage, (p) => `changePage('discounts', ${p})`);
            }
        }

        function loadMyDiscounts() {
            const tbody = document.getElementById('myDiscountsTableBody');
            const paginationEl = document.getElementById('myDiscountsPagination');
            if (!tbody) return;

            const empId = getCurrentEmployeeId();
            if (!empId) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center">لم يتم ربط حسابك بموظف.</td></tr>`;
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            let filtered = discounts.filter(d => String(d.employeeId) === String(empId));
            if (myDiscountsSearchTerm) {
                filtered = filtered.filter(d =>
                    (d.type || '').toLowerCase().includes(myDiscountsSearchTerm) ||
                    (d.month || '').toLowerCase().includes(myDiscountsSearchTerm)
                );
            }
            if (myDiscountsYearFilter) {
                filtered = filtered.filter(d => String(d.month || '').startsWith(String(myDiscountsYearFilter)));
            }
            if (myDiscountsStatusFilter) {
                filtered = filtered.filter(d => d.status === myDiscountsStatusFilter);
            }

            filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            currentMyDiscountPage = Math.min(currentMyDiscountPage, totalPages);
            const start = (currentMyDiscountPage - 1) * itemsPerPage;
            const pageItems = filtered.slice(start, start + itemsPerPage);

            tbody.innerHTML = pageItems.map(d => `
                <tr>
                    <td>${escapeHtml(d.month || '')}</td>
                    <td>${escapeHtml(d.type || '')}</td>
                    <td>${formatCurrency(d.amount || 0)}</td>
                    <td>${escapeHtml(d.status || '')}</td>
                    <td>${formatDate(d.date)}</td>
                    <td>${escapeHtml(d.notes || '')}</td>
                </tr>
            `).join('');

            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentMyDiscountPage, (p) => `changePage('myDiscounts', ${p})`);
            }

            // Summary
            const total = filtered.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
            const months = new Set(filtered.map(d => d.month)).size || 1;
            const avg = total / months;
            const last = filtered[0]?.amount || 0;
            const totalEl = document.getElementById('myTotalDiscounts');
            const avgEl = document.getElementById('myMonthlyAverage');
            const lastEl = document.getElementById('myLastMonthDiscount');
            if (totalEl) totalEl.innerHTML = `${formatNumber(total)} <span class="currency">${currencySymbol}</span>`;
            if (avgEl) avgEl.innerHTML = `${formatNumber(avg)} <span class="currency">${currencySymbol}</span>`;
            if (lastEl) lastEl.innerHTML = `${formatNumber(last)} <span class="currency">${currencySymbol}</span>`;
        }

        /* -------------------------------------------------------------------------- */
        /*                                  Contracts                                 */
        /* -------------------------------------------------------------------------- */

        function showAddContractModal() {
            if (!hasPermission('contracts', 'create')) {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'ليس لديك صلاحية إضافة عقد' });
                return;
            }
            document.getElementById('contractModalTitle').textContent = 'إضافة عقد جديد';
            document.getElementById('contractEditId').value = '';
            document.getElementById('addContractForm')?.reset();

            const employeeSelect = document.getElementById('contractEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' +
                    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
            }

            const modal = new bootstrap.Modal(document.getElementById('addContractModal'));
            modal.show();
        }

        function editContract(contractId) {
            if (!hasPermission('contracts', 'edit')) return;
            const c = contracts.find(x => x.id === contractId);
            if (!c) return;
            document.getElementById('contractModalTitle').textContent = 'تعديل العقد';
            document.getElementById('contractEditId').value = c.id;

            const employeeSelect = document.getElementById('contractEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' +
                    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
                employeeSelect.value = c.employeeId || '';
            }
            document.getElementById('contractType').value = c.type || 'دائم';
            document.getElementById('contractSalary').value = c.salary || 0;
            document.getElementById('contractStartDate').value = (c.startDate || '').slice(0, 10);
            document.getElementById('contractEndDate').value = (c.endDate || '').slice(0, 10);
            document.getElementById('contractStatus').value = c.status || 'نشط';
            document.getElementById('contractNotes').value = c.notes || '';

            const modal = new bootstrap.Modal(document.getElementById('addContractModal'));
            modal.show();
        }

        function saveContract() {
            const editId = document.getElementById('contractEditId').value;
            const employeeIdVal = document.getElementById('contractEmployeeId').value;
            const type = document.getElementById('contractType').value;
            const salary = parseFloat(document.getElementById('contractSalary').value || '0');
            const startDate = document.getElementById('contractStartDate').value;
            const endDate = document.getElementById('contractEndDate').value;
            const status = document.getElementById('contractStatus').value;
            const notes = (document.getElementById('contractNotes').value || '').trim();

            const isEdit = !!editId;
            if (isEdit && !hasPermission('contracts', 'edit')) return;
            if (!isEdit && !hasPermission('contracts', 'create')) return;

            if (!employeeIdVal || !type || isNaN(salary) || salary <= 0 || !startDate) {
                Swal.fire({ icon: 'warning', title: 'نقص بالبيانات', text: 'يرجى اختيار الموظف وإدخال نوع العقد والراتب وتاريخ البدء' });
                return;
            }

            const employeeId = parseInt(employeeIdVal, 10);
            const emp = employees.find(e => e.id === employeeId);
            const employeeName = emp ? emp.name : '';

            if (isEdit) {
                const idx = contracts.findIndex(x => String(x.id) === String(editId));
                if (idx === -1) return;
                contracts[idx] = { ...contracts[idx], employeeId, employeeName, type, salary, startDate, endDate, status, notes };
                logActivity('تعديل عقد', `تم تعديل عقد: ${employeeName}`, 'contracts');
            } else {
                const newId = contracts.length ? Math.max(...contracts.map(x => x.id)) + 1 : 1;
                contracts.push({
                    id: newId,
                    employeeId,
                    employeeName,
                    type,
                    salary,
                    startDate,
                    endDate,
                    status,
                    date: new Date().toISOString(),
                    notes
                });
                logActivity('إضافة عقد', `تم إضافة عقد: ${employeeName}`, 'contracts');
            }

            saveContracts();
            loadContracts();
            loadMyContract();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addContractModal'));
            if (modal) modal.hide();
            Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1200, showConfirmButton: false });
        }

        function deleteContract(contractId) {
            if (!hasPermission('contracts', 'delete')) return;
            const c = contracts.find(x => x.id === contractId);
            if (!c) return;
            Swal.fire({
                icon: 'warning',
                title: 'تأكيد الحذف',
                text: 'هل أنت متأكد من حذف هذا العقد؟',
                showCancelButton: true,
                confirmButtonText: 'حذف',
                cancelButtonText: 'إلغاء'
            }).then(res => {
                if (!res.isConfirmed) return;
                contracts = contracts.filter(x => x.id !== contractId);
                saveContracts();
                loadContracts();
                loadMyContract();
                logActivity('حذف عقد', `تم حذف عقد (${c.employeeName})`, 'contracts');
            });
        }

        function loadContracts() {
            const tbody = document.getElementById('contractsTableBody');
            const paginationEl = document.getElementById('contractsPagination');
            if (!tbody) return;

            const addBtn = document.querySelector("#contractsPage button[onclick=\"showAddContractModal()\"]");
            if (addBtn) addBtn.style.display = hasPermission('contracts', 'create') ? '' : 'none';

            let filtered = [...contracts];
            if (contractsSearchTerm) {
                filtered = filtered.filter(c =>
                    (c.employeeName || '').toLowerCase().includes(contractsSearchTerm) ||
                    (c.type || '').toLowerCase().includes(contractsSearchTerm)
                );
            }
            if (contractsTypeFilter) {
                filtered = filtered.filter(c => c.type === contractsTypeFilter);
            }
            if (contractsStatusFilter) {
                filtered = filtered.filter(c => c.status === contractsStatusFilter);
            }

            filtered.sort((a, b) => new Date(b.startDate || b.date || 0) - new Date(a.startDate || a.date || 0));

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            currentContractPage = Math.min(currentContractPage, totalPages);
            const start = (currentContractPage - 1) * itemsPerPage;
            const pageItems = filtered.slice(start, start + itemsPerPage);

            const canEdit = hasPermission('contracts', 'edit');
            const canDelete = hasPermission('contracts', 'delete');

            tbody.innerHTML = pageItems.map(c => {
                const statusBadge = c.status === 'نشط'
                    ? '<span class="status-badge status-active">نشط</span>'
                    : (c.status === 'منتهي'
                        ? '<span class="status-badge status-inactive">منتهي</span>'
                        : '<span class="status-badge status-pending">معلق</span>');
                return `
                    <tr>
                        <td>${c.id}</td>
                        <td>${escapeHtml(c.employeeName || '')}</td>
                        <td>${escapeHtml(c.type || '')}</td>
                        <td>${formatCurrency(c.salary || 0)}</td>
                        <td>${escapeHtml((c.startDate || '').slice(0,10))}</td>
                        <td>${escapeHtml((c.endDate || '').slice(0,10) || '-')}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="d-flex gap-2 flex-wrap">
                                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="editContract(${c.id})"><i class="bi bi-pencil"></i></button>` : ''}
                                ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="deleteContract(${c.id})"><i class="bi bi-trash"></i></button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentContractPage, (p) => `changePage('contracts', ${p})`);
            }
        }

        function loadMyContract() {
            const container = document.getElementById('myContractContainer');
            if (!container) return;

            const empId = getCurrentEmployeeId();
            if (!empId) {
                container.innerHTML = `<div class="service-card text-center"><h3>لا توجد بيانات</h3><p>لم يتم ربط حسابك بموظف.</p></div>`;
                return;
            }

            const my = contracts
                .filter(c => String(c.employeeId) === String(empId))
                .sort((a, b) => new Date(b.startDate || b.date || 0) - new Date(a.startDate || a.date || 0));

            if (!my.length) {
                container.innerHTML = `<div class="service-card text-center"><h3>لا يوجد عقد</h3><p>لا يوجد عقد مسجل لك حالياً.</p></div>`;
                return;
            }

            const c = my[0];
            container.innerHTML = `
                <div class="service-card">
                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div>
                            <h3 class="mb-1">عقدي الحالي</h3>
                            <div class="text-muted">${escapeHtml(c.type || '')} • ${escapeHtml(c.status || '')}</div>
                        </div>
                        <div class="text-end">
                            <div class="h4 mb-0">${formatCurrency(c.salary || 0)}</div>
                            <small class="text-muted">الراتب</small>
                        </div>
                    </div>
                    <hr/>
                    <div class="row">
                        <div class="col-md-6"><strong>تاريخ البدء:</strong> ${escapeHtml((c.startDate || '').slice(0,10))}</div>
                        <div class="col-md-6"><strong>تاريخ الانتهاء:</strong> ${escapeHtml((c.endDate || '').slice(0,10) || '-')}</div>
                    </div>
                    ${c.notes ? `<hr/><p class="mb-0"><strong>ملاحظات:</strong> ${escapeHtml(c.notes)}</p>` : ''}
                </div>
            `;
        }
        
        // Setup search functionality for my ratings
        function setupMyRatingsSearch() {
            const searchInput = document.getElementById('myRatingsSearch');
            const monthFilter = document.getElementById('myRatingsMonthFilter');
            const minFilter = document.getElementById('myRatingsMinFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    myRatingsSearchTerm = this.value.toLowerCase();
                    currentMyRatingPage = 1;
                    loadMyRatings();
                });
            }
            
            if (monthFilter) {
                monthFilter.addEventListener('change', function() {
                    myRatingsMonthFilter = this.value;
                    currentMyRatingPage = 1;
                    loadMyRatings();
                });
            }
            
            if (minFilter) {
                minFilter.addEventListener('input', function() {
                    myRatingsMinFilter = this.value;
                    currentMyRatingPage = 1;
                    loadMyRatings();
                });
            }
        }
        
        // Setup search functionality for ratings
        function setupRatingsSearch() {
            const searchInput = document.getElementById('ratingsSearch');
            const monthFilter = document.getElementById('ratingsMonthFilter');
            const minFilter = document.getElementById('ratingsMinFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    ratingsSearchTerm = this.value.toLowerCase();
                    currentRatingPage = 1;
                    loadRatings();
                });
            }
            
            if (monthFilter) {
                monthFilter.addEventListener('change', function() {
                    ratingsMonthFilter = this.value;
                    currentRatingPage = 1;
                    loadRatings();
                });
            }
            
            if (minFilter) {
                minFilter.addEventListener('input', function() {
                    ratingsMinFilter = this.value;
                    currentRatingPage = 1;
                    loadRatings();
                });
            }
        }

        
        // Load jobs page
        function loadJobsPage() {
            // Load available jobs
            const container = document.getElementById('availableJobs');
            container.innerHTML = '';
            
            if (availableJobs.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <h5>لا توجد وظائف متاحة حالياً</h5>
                        <p>يرجى التحقق لاحقاً</p>
                    </div>
                `;
                return;
            }
            
            availableJobs.forEach((job, index) => {
                const typeClass = job.type === 'دوام كامل' ? 'job-fulltime' : 
                                job.type === 'دوام جزئي' ? 'job-parttime' : 'job-remote';
                
                const jobCard = `
                    <div class="job-card" data-aos="fade-up" data-aos-delay="${index * 100}">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h4 class="mb-1">${job.title}</h4>
                                <p class="text-muted mb-1">${job.department} - ${job.location}</p>
                                <span class="job-badge ${typeClass}">${job.type}</span>
                            </div>
                            <div class="text-left">
                                <span class="badge bg-success">${job.status}</span>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <h6>الوصف:</h6>
                            <p>${job.description}</p>
                        </div>
                        
                        <div class="mb-3">
                            <h6>المتطلبات:</h6>
                            <ul>
                                ${job.requirements.map(req => `<li>${req}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>الراتب:</strong> ${job.salary}
                            </div>
                            <div>
                                <small class="text-muted">تاريخ النشر: ${formatDate(job.createdAt)}</small>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += jobCard;
            });
            
            // Add form submission handler
            document.getElementById('jobApplicationForm').addEventListener('submit', function(e) {
                e.preventDefault();
                submitJobApplication();
            });
        }
        
        // Submit job application
        function submitJobApplication() {
            const form = document.getElementById('jobApplicationForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const applicationData = {
                name: document.getElementById('applicantName').value,
                email: document.getElementById('applicantEmail').value,
                phone: document.getElementById('applicantPhone').value,
                job: document.getElementById('applicantJob').value,
                message: document.getElementById('applicantMessage').value,
                notes: document.getElementById('applicantNotes').value,
                timestamp: new Date().toISOString()
            };
            
            // Send email using EmailJS
            const emailParams = {
                to_email: 'grdo2697@gmail.com',
                applicant_name: applicationData.name,
                applicant_email: applicationData.email,
                applicant_phone: applicationData.phone,
                job_position: applicationData.job,
                application_message: applicationData.message,
                notes: applicationData.notes,
                timestamp: formatDate(applicationData.timestamp)
            };
            
            // For demo purposes, we'll just show the success message
            showSuccessMessage();
            
            // Log the application
            logActivity('تقديم وظيفة', `${applicationData.name} تقدم على وظيفة ${applicationData.job}`, 'jobs');
        }
        
        function showSuccessMessage() {
            Swal.fire({
                icon: 'success',
                title: 'تم التقديم بنجاح',
                text: 'تم إرسال طلب التقديم بنجاح. سنتواصل معك قريباً.',
                timer: 3000,
                showConfirmButton: false
            });
            
            // Reset form
            document.getElementById('jobApplicationForm').reset();
        }
        
        // Load advanced dashboard
        function loadAdvancedDashboard() {
            // Update statistics
            document.getElementById('totalActivities').textContent = activityLog.length;
            document.getElementById('userActivities').textContent = currentUser ? 
                activityLog.filter(a => a.userId === currentUser.id).length : 0;
            document.getElementById('contentEdits').textContent = contentEdits.length;
            
            // Calculate today's activities
            const today = new Date().toDateString();
            const todayActivities = activityLog.filter(a => {
                const activityDate = new Date(a.timestamp).toDateString();
                return activityDate === today;
            }).length;
            document.getElementById('todayActivities').textContent = todayActivities;
            
            // Load activity log
            loadActivityLog();
            
            // Load content edits
            loadContentEdits();
            
            // Load most active users
            loadMostActiveUsers();
            
            // Calculate statistics
            calculateActivityStats();
        }
        
        function loadActivityLog() {
            const container = document.getElementById('activityLogList');
            container.innerHTML = '';
            
            const recentActivities = activityLog.slice(0, 10);
            
            if (recentActivities.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <p>لا توجد نشاطات مسجلة</p>
                    </div>
                `;
                return;
            }
            
            recentActivities.forEach(activity => {
                const activityItem = `
                    <div class="activity-log-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <span class="activity-user">${activity.userName}</span>
                                <span class="activity-action"> - ${activity.action}</span>
                                <p class="mb-1">${activity.details}</p>
                            </div>
                            <div class="text-left">
                                <small class="activity-time">${formatDateTime(activity.timestamp)}</small>
                                <br>
                                <small class="text-muted">${activity.page}</small>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += activityItem;
            });
        }
        
        function loadContentEdits() {
            const tbody = document.getElementById('contentEditsTable');
            tbody.innerHTML = '';
            
            const recentEdits = contentEdits.slice(0, 10);
            
            if (recentEdits.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">لا توجد تعديلات</td>
                    </tr>
                `;
                return;
            }
            
            recentEdits.forEach(edit => {
                const row = `
                    <tr>
                        <td>${edit.elementId}</td>
                        <td><small>${edit.oldValue || '-'}</small></td>
                        <td><small>${edit.newValue || '-'}</small></td>
                        <td>${edit.userName}</td>
                        <td>${formatDateTime(edit.timestamp)}</td>
                        <td>${edit.page}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }
        
        function loadMostActiveUsers() {
            const container = document.getElementById('mostActiveUsers');
            container.innerHTML = '';
            
            // Calculate user activity counts
            const userActivityCounts = {};
            activityLog.forEach(activity => {
                userActivityCounts[activity.userName] = (userActivityCounts[activity.userName] || 0) + 1;
            });
            
            // Convert to array and sort
            const sortedUsers = Object.entries(userActivityCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            
            if (sortedUsers.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <p>لا توجد بيانات</p>
                    </div>
                `;
                return;
            }
            
            sortedUsers.forEach(user => {
                const userItem = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${user.name}</strong>
                        </div>
                        <div>
                            <span class="badge bg-primary">${user.count} نشاط</span>
                        </div>
                    </div>
                `;
                container.innerHTML += userItem;
            });
        }
        
        function calculateActivityStats() {
            // Calculate activity statistics
            const totalEdits = activityLog.filter(a => a.action.includes('تعديل')).length;
            const totalDeletes = activityLog.filter(a => a.action.includes('حذف')).length;
            const totalAdds = activityLog.filter(a => a.action.includes('إضافة')).length;
            const lastActivity = activityLog.length > 0 ? activityLog[0].timestamp : null;
            
            document.getElementById('totalEditsCount').textContent = totalEdits;
            document.getElementById('totalDeletesCount').textContent = totalDeletes;
            document.getElementById('totalAddsCount').textContent = totalAdds;
            document.getElementById('lastActivityTime').textContent = lastActivity ? 
                formatDateTime(lastActivity) : '-';
        }
        
        // Format date and time
        function formatDateTime(dateString) {
            if (!dateString) return 'غير محدد';
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-IQ', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Format currency
        function formatCurrency(amount) {
            const n = Number(amount) || 0;
            const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
            // Keep currency label in English digits as requested
            return `${currencySymbol} ${formatted}`;
        }
        
        // Format date
        function formatDate(dateString) {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                // Arabic language, Latin (English) digits
                return new Intl.DateTimeFormat('ar-IQ-u-nu-latn', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).format(date);
            } catch (e) {
                return dateString;
            }
        }
        
        // Format month
        function formatMonth(monthString) {
            if (!monthString) return 'غير محدد';
            const [year, month] = monthString.split('-');
            const monthNames = [
                'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        }

        // Read a file as a data URL (used for profile avatars)
        function readFileAsDataUrl(file){
            return new Promise((resolve, reject)=>{
                try{
                    const reader = new FileReader();
                    reader.onerror = () => reject(new Error('FileReader error'));
                    reader.onload = () => resolve(String(reader.result||''));
                    reader.readAsDataURL(file);
                }catch(err){
                    reject(err);
                }
            });
        }
        
        // Get status class
        function getStatusClass(status) {
            switch (status) {
                case 'active':
                case 'نشط':
                case 'مفعل':
                case 'جديدة':
                    return 'status-active';
                case 'inactive':
                case 'غير نشط':
                case 'ملغى':
                case 'ملغي':
                case 'غير متاحة':
                    return 'status-inactive';
                case 'vacation':
                case 'في إجازة':
                case 'معلق':
                case 'صيانة':
                    return 'status-vacation';
                default:
                    return 'status-inactive';
            }
        }
        
        // Get status text
        function getStatusText(status) {
            switch (status) {
                case 'active': return 'نشط';
                case 'inactive': return 'غير نشط';
                case 'vacation': return 'في إجازة';
                default: return status;
            }
        }
        
        // Get employee type text
        function getEmployeeTypeText(type) {
            switch (type) {
                case 'regular': return 'موظف عادي';
                case 'manager': return 'مدير قسم';
                case 'supervisor': return 'مشرف';
                case 'admin': return 'مدير نظام';
                default: return type;
            }
        }
        
        // Get employee type class
        function getEmployeeTypeClass(type) {
            switch (type) {
                case 'regular': return 'type-regular';
                case 'manager': return 'type-manager';
                case 'supervisor': return 'type-supervisor';
                case 'admin': return 'type-admin';
                default: return 'type-regular';
            }
        }
        
        // Get star rating HTML
        function getStarRating(rating) {
            const numRating = parseFloat(rating);
            const fullStars = Math.floor(numRating);
            const halfStar = numRating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
            
            let stars = '';
            for (let i = 0; i < fullStars; i++) {
                stars += '<i class="bi bi-star-fill"></i>';
            }
            if (halfStar) {
                stars += '<i class="bi bi-star-half"></i>';
            }
            for (let i = 0; i < emptyStars; i++) {
                stars += '<i class="bi bi-star"></i>';
            }
            
            return stars;
        }

        // -----------------------------
        // Vehicles (Admin/HR/Manager)
        // -----------------------------
        function loadVehicles() {
            const tbody = document.getElementById('vehiclesTableBody');
            const paginationEl = document.getElementById('vehiclesPagination');
            if (!tbody) return;

            // Toggle add button visibility
            const addBtn = document.querySelector("#vehiclesPage button[onclick=\"showAddVehicleModal()\"]");
            if (addBtn) addBtn.style.display = hasPermission('vehicles', 'create') ? '' : 'none';

            let filtered = [...vehicles];

            // Search
            if (vehiclesSearchTerm) {
                filtered = filtered.filter(v =>
                    (v.employeeName || '').toLowerCase().includes(vehiclesSearchTerm) ||
                    (v.plateNumber || '').toLowerCase().includes(vehiclesSearchTerm) ||
                    (v.model || '').toLowerCase().includes(vehiclesSearchTerm)
                );
            }

            // Filters
            if (vehiclesTypeFilter) filtered = filtered.filter(v => v.type === vehiclesTypeFilter);
            if (vehiclesStatusFilter) filtered = filtered.filter(v => v.status === vehiclesStatusFilter);

            // Sort newest first
            filtered.sort((a, b) => new Date(b.deliveryDate || 0) - new Date(a.deliveryDate || 0));

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            currentVehiclePage = Math.min(currentVehiclePage, totalPages);

            const start = (currentVehiclePage - 1) * itemsPerPage;
            const end = Math.min(start + itemsPerPage, totalItems);
            const pageItems = filtered.slice(start, end);

            if (pageItems.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4">لا توجد مركبات مطابقة للبحث/الفلتر</td>
                    </tr>
                `;
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            const canEdit = hasPermission('vehicles', 'edit');
            const canDelete = hasPermission('vehicles', 'delete');

            tbody.innerHTML = pageItems.map(v => {
                const statusClass = getStatusClass(v.status);
                const actions = `
                    <div class="d-flex gap-2 flex-wrap">
                        ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="editVehicle(${v.id})"><i class="bi bi-pencil"></i></button>` : ''}
                        ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="deleteVehicle(${v.id})"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                `;
                return `
                    <tr>
                        <td>${escapeHtml(v.plateNumber || '')}</td>
                        <td>${escapeHtml(v.type || '')}</td>
                        <td>${escapeHtml(v.model || '')}</td>
                        <td>${escapeHtml(v.employeeName || '')}</td>
                        <td>${formatDate(v.deliveryDate)}</td>
                        <td><span class="employee-status ${statusClass}">${escapeHtml(v.status || '')}</span></td>
                        <td>${actions}</td>
                    </tr>
                `;
            }).join('');

            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentVehiclePage, (p) => `changePage('vehicles', ${p})`);
            }
        }

        function showAddVehicleModal() {
            if (!hasPermission('vehicles', 'create')) {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'ليس لديك صلاحية إضافة مركبة' });
                return;
            }

            document.getElementById('vehicleModalTitle').textContent = 'إضافة مركبة جديدة';
            document.getElementById('vehicleEditId').value = '';
            document.getElementById('addVehicleForm')?.reset();

            const employeeSelect = document.getElementById('vehicleEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
            }

            const modal = new bootstrap.Modal(document.getElementById('addVehicleModal'));
            modal.show();
        }

        function editVehicle(vehicleId) {
            if (!hasPermission('vehicles', 'edit')) return;
            const v = vehicles.find(x => x.id === vehicleId);
            if (!v) return;

            document.getElementById('vehicleModalTitle').textContent = 'تعديل المركبة';
            document.getElementById('vehicleEditId').value = v.id;
            document.getElementById('vehiclePlateNumber').value = v.plateNumber || '';
            document.getElementById('vehicleType').value = v.type || 'سيدان';
            document.getElementById('vehicleModel').value = v.model || '';
            document.getElementById('vehicleDeliveryDate').value = (v.deliveryDate || '').slice(0, 10);
            document.getElementById('vehicleStatus').value = v.status || 'جديدة';
            document.getElementById('vehicleNotes').value = v.notes || '';

            const employeeSelect = document.getElementById('vehicleEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
                employeeSelect.value = v.employeeId || '';
            }

            const modal = new bootstrap.Modal(document.getElementById('addVehicleModal'));
            modal.show();
        }

        function saveVehicle() {
            const editId = document.getElementById('vehicleEditId').value;
            const plateNumber = (document.getElementById('vehiclePlateNumber').value || '').trim();
            const type = document.getElementById('vehicleType').value;
            const model = (document.getElementById('vehicleModel').value || '').trim();
            const employeeIdVal = document.getElementById('vehicleEmployeeId').value;
            const deliveryDate = document.getElementById('vehicleDeliveryDate').value;
            const status = document.getElementById('vehicleStatus').value;
            const notes = (document.getElementById('vehicleNotes').value || '').trim();

            const isEdit = !!editId;
            if (isEdit && !hasPermission('vehicles', 'edit')) return;
            if (!isEdit && !hasPermission('vehicles', 'create')) return;

            if (!plateNumber || !model || !employeeIdVal || !deliveryDate || !status || !type) {
                Swal.fire({ icon: 'warning', title: 'نقص بالبيانات', text: 'يرجى ملء جميع الحقول المطلوبة' });
                return;
            }

            const employeeId = parseInt(employeeIdVal, 10);
            const employee = employees.find(e => e.id === employeeId);
            const employeeName = employee ? employee.name : '';

            // Plate number uniqueness check
            const exists = vehicles.find(v => (v.plateNumber || '').toLowerCase() === plateNumber.toLowerCase() && String(v.id) !== String(editId));
            if (exists) {
                Swal.fire({ icon: 'error', title: 'رقم اللوحة موجود', text: 'يوجد مركبة بنفس رقم اللوحة' });
                return;
            }

            if (isEdit) {
                const idx = vehicles.findIndex(v => String(v.id) === String(editId));
                if (idx === -1) return;
                vehicles[idx] = { ...vehicles[idx], plateNumber, type, model, employeeId, employeeName, deliveryDate: new Date(deliveryDate).toISOString(), status, notes };
                logActivity('تعديل مركبة', `تم تعديل مركبة: ${plateNumber}`, 'vehicles');
            } else {
                const newId = vehicles.length ? Math.max(...vehicles.map(v => v.id)) + 1 : 1;
                vehicles.push({
                    id: newId,
                    plateNumber,
                    type,
                    model,
                    employeeId,
                    employeeName,
                    deliveryDate: new Date(deliveryDate).toISOString(),
                    status,
                    notes
                });
                logActivity('إضافة مركبة', `تم إضافة مركبة: ${plateNumber}`, 'vehicles');
            }

            saveVehicles();
            loadVehicles();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addVehicleModal'));
            if (modal) modal.hide();

            Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1200, showConfirmButton: false });
        }

        function deleteVehicle(vehicleId) {
            if (!hasPermission('vehicles', 'delete')) return;
            const v = vehicles.find(x => x.id === vehicleId);
            if (!v) return;

            Swal.fire({
                icon: 'warning',
                title: 'تأكيد الحذف',
                text: `هل تريد حذف المركبة (${v.plateNumber})؟`,
                showCancelButton: true,
                confirmButtonText: 'نعم، احذف',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (!result.isConfirmed) return;
                vehicles = vehicles.filter(x => x.id !== vehicleId);
                saveVehicles();
                logActivity('حذف مركبة', `تم حذف مركبة: ${v.plateNumber}`, 'vehicles');
                loadVehicles();
                Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
            });
        }

        // -----------------------------
        // Ratings (Admin/HR/Manager) + My Ratings
        // -----------------------------
        // Numeric ratings: 0..10 with 0.1 steps
        function syncRatingInput(value) {
            const v = Math.max(0, Math.min(10, parseFloat(value || 0)));
            ratingStars = v;
            const hidden = document.getElementById('ratingValue');
            if (hidden) hidden.value = String(v);
            const numeric = document.getElementById('ratingNumeric');
            if (numeric && String(numeric.value) !== String(v)) numeric.value = v;

            // Star UI removed; keep numeric only
        }

        function setRating(stars) {
            // Keeps backward compatibility with clicking stars (sets integer)
            syncRatingInput(stars);
        }

        function renderSelectedCriteria() {
            const container = document.getElementById('selectedCriteria');
            if (!container) return;
            if (!selectedCriteria.length) {
                container.innerHTML = '<small class="text-muted">لا توجد معايير مضافة</small>';
                return;
            }
            container.innerHTML = selectedCriteria.map((c, i) => `
                <span class="badge bg-light text-dark me-1 mb-1" style="border:1px solid rgba(0,0,0,.1);">
                    ${escapeHtml(c)}
                    <button type="button" class="btn btn-sm btn-link p-0 ms-2" onclick="removeCriteria(${i})" style="text-decoration:none;">×</button>
                </span>
            `).join('');
        }

        function removeCriteria(index) {
            selectedCriteria.splice(index, 1);
            renderSelectedCriteria();
        }

        function attachCriteriaHandlers() {
            const input = document.getElementById('ratingCriteriaInput');
            if (!input) return;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (input.value || '').trim();
                    if (val) {
                        selectedCriteria.push(val);
                        input.value = '';
                        renderSelectedCriteria();
                    }
                }
            };
        }

        function showAddRatingModal() {
            if (!hasPermission('ratings', 'create')) {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'ليس لديك صلاحية إضافة تقييم' });
                return;
            }

            document.getElementById('ratingModalTitle').textContent = 'إضافة تقييم جديد';
            document.getElementById('ratingEditId').value = '';
            document.getElementById('addRatingForm')?.reset();

            selectedCriteria = [];
            renderSelectedCriteria();
            attachCriteriaHandlers();

            const employeeSelect = document.getElementById('ratingEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
            }

            // Default reviewer is the current user name
            const reviewerInput = document.getElementById('ratingReviewer');
            if (reviewerInput && currentUser) reviewerInput.value = currentUser.name;

            syncRatingInput(0);
            const modal = new bootstrap.Modal(document.getElementById('addRatingModal'));
            modal.show();

            const numeric = document.getElementById('ratingNumeric');
            if (numeric) {
                numeric.oninput = () => syncRatingInput(numeric.value);
            }
        }

        function editRating(ratingId) {
            if (!hasPermission('ratings', 'edit')) return;
            const r = ratings.find(x => x.id === ratingId);
            if (!r) return;

            document.getElementById('ratingModalTitle').textContent = 'تعديل التقييم';
            document.getElementById('ratingEditId').value = r.id;
            document.getElementById('ratingComment').value = r.comment || '';
            document.getElementById('ratingReviewer').value = r.reviewer || '';

            const employeeSelect = document.getElementById('ratingEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
                employeeSelect.value = r.employeeId || '';
            }

            selectedCriteria = Array.isArray(r.criteria) ? [...r.criteria] : [];
            renderSelectedCriteria();
            attachCriteriaHandlers();

            syncRatingInput(r.rating || 0);
            const numeric = document.getElementById('ratingNumeric');
            if (numeric) numeric.oninput = () => syncRatingInput(numeric.value);

            const modal = new bootstrap.Modal(document.getElementById('addRatingModal'));
            modal.show();
        }

        function saveRating() {
            const editId = document.getElementById('ratingEditId').value;
            const employeeIdVal = document.getElementById('ratingEmployeeId').value;
            const comment = (document.getElementById('ratingComment').value || '').trim();
            const reviewer = (document.getElementById('ratingReviewer').value || '').trim();
            const ratingVal = parseFloat(document.getElementById('ratingValue').value || '0');

            const isEdit = !!editId;
            if (isEdit && !hasPermission('ratings', 'edit')) return;
            if (!isEdit && !hasPermission('ratings', 'create')) return;

            if (!employeeIdVal || !comment || !reviewer || isNaN(ratingVal) || ratingVal <= 0) {
                Swal.fire({ icon: 'warning', title: 'نقص بالبيانات', text: 'يرجى اختيار الموظف وإدخال تقييم رقمي وتعليق ومقيم' });
                return;
            }

            const employeeId = parseInt(employeeIdVal, 10);
            const emp = employees.find(e => e.id === employeeId);
            const employeeName = emp ? emp.name : '';

            if (isEdit) {
                const idx = ratings.findIndex(x => String(x.id) === String(editId));
                if (idx === -1) return;
                ratings[idx] = {
                    ...ratings[idx],
                    employeeId,
                    employeeName,
                    rating: Math.round(ratingVal * 10) / 10,
                    reviewer,
                    comment,
                    criteria: [...selectedCriteria]
                };
                logActivity('تعديل تقييم', `تم تعديل تقييم: ${employeeName}`, 'ratings');
            } else {
                const newId = ratings.length ? Math.max(...ratings.map(x => x.id)) + 1 : 1;
                ratings.push({
                    id: newId,
                    employeeId,
                    employeeName,
                    rating: Math.round(ratingVal * 10) / 10,
                    date: new Date().toISOString(),
                    reviewer,
                    comment,
                    criteria: [...selectedCriteria]
                });
                logActivity('إضافة تقييم', `تم إضافة تقييم: ${employeeName}`, 'ratings');
            }

            saveRatings();
            loadRatings();
            loadMyRatings();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addRatingModal'));
            if (modal) modal.hide();

            Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1200, showConfirmButton: false });
        }

        function deleteRating(ratingId) {
            if (!hasPermission('ratings', 'delete')) return;
            const r = ratings.find(x => x.id === ratingId);
            if (!r) return;
            Swal.fire({
                icon: 'warning',
                title: 'تأكيد الحذف',
                text: `هل تريد حذف تقييم (${r.employeeName})؟`,
                showCancelButton: true,
                confirmButtonText: 'نعم، احذف',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (!result.isConfirmed) return;
                ratings = ratings.filter(x => x.id !== ratingId);
                saveRatings();
                logActivity('حذف تقييم', `تم حذف تقييم: ${r.employeeName}`, 'ratings');
                loadRatings();
                loadMyRatings();
                Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
            });
        }

        function loadRatings() {
            const container = document.getElementById('ratingsContainer');
            const paginationEl = document.getElementById('ratingsPagination');
            if (!container) return;

            const addBtn = document.querySelector("#ratingsPage button[onclick=\"showAddRatingModal()\"]");
            if (addBtn) addBtn.style.display = hasPermission('ratings', 'create') ? '' : 'none';

            let filtered = [...ratings];

            // Search
            if (ratingsSearchTerm) {
                filtered = filtered.filter(r =>
                    (r.employeeName || '').toLowerCase().includes(ratingsSearchTerm) ||
                    (r.reviewer || '').toLowerCase().includes(ratingsSearchTerm) ||
                    (r.comment || '').toLowerCase().includes(ratingsSearchTerm)
                );
            }

            // Month filter
            if (ratingsMonthFilter) {
                filtered = filtered.filter(r => (r.date || '').slice(0, 7) === ratingsMonthFilter);
            }

            // Minimum numeric rating filter
            if (ratingsMinFilter !== '' && ratingsMinFilter !== null && ratingsMinFilter !== undefined) {
                const min = parseFloat(ratingsMinFilter);
                if (!isNaN(min)) filtered = filtered.filter(r => parseFloat(r.rating || 0) >= min);
            }

            filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            currentRatingPage = Math.min(currentRatingPage, totalPages);

            const start = (currentRatingPage - 1) * itemsPerPage;
            const end = Math.min(start + itemsPerPage, totalItems);
            const pageItems = filtered.slice(start, end);

            const canEdit = hasPermission('ratings', 'edit');
            const canDelete = hasPermission('ratings', 'delete');

            if (pageItems.length === 0) {
                container.innerHTML = `
                    <div class="service-card text-center">
                        <h3>لا توجد تقييمات</h3>
                        <p>لم يتم العثور على أي تقييمات مطابقة</p>
                    </div>
                `;
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            container.innerHTML = pageItems.map(r => {
                const criteriaHtml = Array.isArray(r.criteria) && r.criteria.length
                    ? `<div class="mt-2">${r.criteria.map(c => `<span class="badge bg-light text-dark me-1" style="border:1px solid rgba(0,0,0,.1)">${escapeHtml(c)}</span>`).join('')}</div>`
                    : '';

                return `
                    <div class="service-card mb-3">
                        <div class="d-flex justify-content-between align-items-start gap-3">
                            <div>
                                <h4 class="mb-1">${escapeHtml(r.employeeName || '')}</h4>
                                <div class="text-muted" style="font-size:.95rem;">
                                    <span class="me-2"><span class="badge bg-success">${escapeHtml(String(r.rating))}</span></span>
                                    <span class="me-2"><i class="bi bi-calendar3"></i> ${formatDate(r.date)}</span>
                                    <span><i class="bi bi-person"></i> ${escapeHtml(r.reviewer || '')}</span>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="editRating(${r.id})"><i class="bi bi-pencil"></i></button>` : ''}
                                ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="deleteRating(${r.id})"><i class="bi bi-trash"></i></button>` : ''}
                            </div>
                        </div>
                        <hr/>
                        <p class="mb-2">${escapeHtml(r.comment || '')}</p>
                        ${criteriaHtml}
                    </div>
                `;
            }).join('');

            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentMyRatingPage, (p) => `changePage('myRatings', ${p})`);
            }
        }

        function loadMyRatings() {
            const container = document.getElementById('myRatingsContainer');
            const paginationEl = document.getElementById('myRatingsPagination');
            if (!container) return;

            const canEdit = hasPermission('ratings', 'edit');
            const canDelete = hasPermission('ratings', 'delete');

            const empId = getCurrentEmployeeId();
            if (!empId) {
                container.innerHTML = `
                    <div class="service-card text-center">
                        <h3>لا توجد بيانات</h3>
                        <p>لم يتم ربط حسابك بموظف.</p>
                    </div>
                `;
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            let filtered = ratings.filter(r => String(r.employeeId) === String(empId));

            if (myRatingsSearchTerm) {
                filtered = filtered.filter(r =>
                    (r.reviewer || '').toLowerCase().includes(myRatingsSearchTerm) ||
                    (r.comment || '').toLowerCase().includes(myRatingsSearchTerm)
                );
            }

            if (myRatingsMonthFilter) {
                filtered = filtered.filter(r => (r.date || '').slice(0, 7) === myRatingsMonthFilter);
            }

            if (myRatingsMinFilter !== '' && myRatingsMinFilter !== null && myRatingsMinFilter !== undefined) {
                const min = parseFloat(myRatingsMinFilter);
                if (!isNaN(min)) filtered = filtered.filter(r => parseFloat(r.rating || 0) >= min);
            }

            filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            currentMyRatingPage = Math.min(currentMyRatingPage, totalPages);

            const start = (currentMyRatingPage - 1) * itemsPerPage;
            const end = Math.min(start + itemsPerPage, totalItems);
            const pageItems = filtered.slice(start, end);

            if (pageItems.length === 0) {
                container.innerHTML = `
                    <div class="service-card text-center">
                        <h3>لا توجد تقييمات</h3>
                        <p>لم يتم العثور على أي تقييمات مطابقة</p>
                    </div>
                `;
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            container.innerHTML = pageItems.map(r => {
                const criteriaHtml = Array.isArray(r.criteria) && r.criteria.length
                    ? `<div class="mt-2">${r.criteria.map(c => `<span class="badge bg-light text-dark me-1" style="border:1px solid rgba(0,0,0,.1)">${escapeHtml(c)}</span>`).join('')}</div>`
                    : '';
                return `
                    <div class="service-card mb-3">
                        <div class="d-flex justify-content-between align-items-start gap-3">
                            <div>
                                <h4 class="mb-1">${escapeHtml(r.employeeName || '')}</h4>
                                <div class="text-muted" style="font-size:.95rem;">
                                    <span class="me-2">تقييم: <span class="badge bg-primary">${escapeHtml(String(r.rating))}</span></span>
                                    <span class="me-2"><i class="bi bi-calendar3"></i> ${formatDate(r.date)}</span>
                                    <span><i class="bi bi-person"></i> ${escapeHtml(r.reviewer || '')}</span>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="editRating(${r.id})"><i class="bi bi-pencil"></i></button>` : ''}
                                ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="deleteRating(${r.id})"><i class="bi bi-trash"></i></button>` : ''}
                            </div>
                        </div>
                        <hr/>
                        <p class="mb-2">${escapeHtml(r.comment || '')}</p>
                        ${criteriaHtml}
                    </div>
                `;
            }).join('');

            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentMyRatingPage, (p) => `changePage('myRatings', ${p})`);
            }
        }
        
        // Get current employee ID
        function getCurrentEmployeeId() {
            if (currentUser && currentUser.employeeId) {
                return currentUser.employeeId;
            }
            
            // Try to find employee by email
            if (currentUser) {
                const employee = employees.find(emp => emp.email === currentUser.email);
                return employee ? employee.id : null;
            }
            
            return null;
        }
        
        // Preview employee photo
        function previewEmployeePhoto(event) {
            const input = event.target;
            const preview = document.getElementById('employeePhotoPreview');
            const removeBtn = document.getElementById('removePhotoBtn');
            
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    document.getElementById('employeePhotoBase64').value = e.target.result;
                    removeBtn.style.display = 'inline-block';
                };
                
                reader.readAsDataURL(input.files[0]);
            }
        }
        
        // Remove employee photo
        function removeEmployeePhoto() {
            document.getElementById('employeePhotoPreview').src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
            document.getElementById('employeePhotoBase64').value = '';
            document.getElementById('employeePhotoUpload').value = '';
            document.getElementById('removePhotoBtn').style.display = 'none';
        }
        
        // Show add employee modal
        function showAddEmployeeModal() {
            // Reset form
            document.getElementById('addEmployeeForm').reset();
            document.getElementById('employeeEditId').value = '';
            document.getElementById('employeeModalTitle').textContent = 'إضافة موظف جديد';
            document.getElementById('saveEmployeeBtn').textContent = 'حفظ الموظف';
            
            // Reset photo
            removeEmployeePhoto();
            
            // Set default values
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('employeeJoinDate').value = today;
            document.getElementById('employeeBirthDate').value = '1990-01-01';
            document.getElementById('employeeSalary').value = '1500000';
            
            const modal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
            modal.show();
        }
        
        // Edit employee
        function editEmployee(id) {
            const employee = employees.find(emp => emp.id === id);
            if (!employee) {
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'الموظف غير موجود'
                });
                return;
            }
            
            // Fill form with employee data
            document.getElementById('employeeEditId').value = employee.id;
            document.getElementById('employeeName').value = employee.name;
            document.getElementById('employeeIdNumber').value = employee.idNumber;
            document.getElementById('employeePhone').value = employee.phone;
            document.getElementById('employeeEmail').value = employee.email;
            document.getElementById('employeeBirthDate').value = employee.birthDate.split('T')[0];
            document.getElementById('employeeGender').value = employee.gender;
            document.getElementById('employeeFamilyNumber').value = employee.familyNumber;
            document.getElementById('employeeMaritalStatus').value = employee.maritalStatus;
            document.getElementById('employeePosition').value = employee.position;
            document.getElementById('employeeDepartment').value = employee.department;
            document.getElementById('employeeAddress').value = employee.address;
            document.getElementById('employeeType').value = employee.employeeType;
            document.getElementById('employeeSalary').value = employee.salary;
            document.getElementById('employeeStatus').value = employee.status;
            document.getElementById('employeeJoinDate').value = employee.joinDate.split('T')[0];
            
            // Set photo if exists
            if (employee.photo) {
                document.getElementById('employeePhotoPreview').src = employee.photo;
                document.getElementById('employeePhotoBase64').value = employee.photo;
                document.getElementById('removePhotoBtn').style.display = 'inline-block';
            } else {
                removeEmployeePhoto();
            }
            
            // Update modal title and button
            document.getElementById('employeeModalTitle').textContent = 'تعديل موظف';
            document.getElementById('saveEmployeeBtn').textContent = 'تحديث الموظف';
            
            const modal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
            modal.show();
        }
        
        // View employee details
        function viewEmployeeDetails(id) {
            const employee = employees.find(emp => emp.id === id);
            if (!employee) {
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'الموظف غير موجود'
                });
                return;
            }
            
            const statusText = getStatusText(employee.status);
            const employeeTypeText = getEmployeeTypeText(employee.employeeType);
            
            const detailsHtml = `
                <div class="employee-details-modal">
                    <div class="text-center mb-4">
                        ${employee.photo ? 
                            `<img src="${employee.photo}" class="employee-avatar" alt="${employee.name}" style="width: 150px; height: 150px;">` :
                            `<div class="employee-avatar" style="width: 150px; height: 150px; background: ${getGradientForUser(employee.id)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto;">
                                ${employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>`
                        }
                        <h3 class="mt-3">${employee.name}</h3>
                        <p class="text-muted">${employee.position} - ${employee.department}</p>
                        <div class="d-flex justify-content-center gap-2">
                            <span class="employee-status ${getStatusClass(employee.status)}">${statusText}</span>
                            <span class="employee-type-badge ${getEmployeeTypeClass(employee.employeeType)}">${employeeTypeText}</span>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">رقم الهوية</div>
                                <div class="detail-value">${employee.idNumber}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">رقم الهاتف</div>
                                <div class="detail-value">${employee.phone}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">البريد الإلكتروني</div>
                                <div class="detail-value">${employee.email}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">رقم العائلة</div>
                                <div class="detail-value">${employee.familyNumber}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">الحالة الاجتماعية</div>
                                <div class="detail-value">${employee.maritalStatus}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">الجنس</div>
                                <div class="detail-value">${employee.gender}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">تاريخ الميلاد</div>
                                <div class="detail-value">${formatDate(employee.birthDate)}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="detail-item">
                                <div class="detail-label">تاريخ التعيين</div>
                                <div class="detail-value">${formatDate(employee.joinDate)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">الراتب الأساسي</div>
                        <div class="detail-value">${formatCurrency(employee.salary)}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">العنوان</div>
                        <div class="detail-value">${employee.address}</div>
                    </div>
                </div>
            `;
            
            document.getElementById('viewDetailsTitle').textContent = `تفاصيل الموظف: ${employee.name}`;
            document.getElementById('viewDetailsContent').innerHTML = detailsHtml;
            
            const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
            modal.show();
        }
        
        // Delete employee
        function deleteEmployee(id) {
            Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "لن تتمكن من التراجع عن هذا الإجراء!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'نعم، احذف!',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (result.isConfirmed) {
                    const employeeIndex = employees.findIndex(emp => emp.id === id);
                    if (employeeIndex !== -1) {
                        const employeeName = employees[employeeIndex].name;
                        employees.splice(employeeIndex, 1);
                        saveEmployees();
                        
                        // Log activity
                        logActivity('حذف موظف', `تم حذف الموظف: ${employeeName}`);
                        
                        // Reload employees if on employees page
                        if (currentPage === 'employees') {
                            loadEmployees();
                        }
                        
                        Swal.fire(
                            'تم الحذف!',
                            'تم حذف الموظف بنجاح.',
                            'success'
                        );
                    }
                }
            });
        }
        
        // Save employee (add or update)
        function saveEmployee() {
            const form = document.getElementById('addEmployeeForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const editId = document.getElementById('employeeEditId').value;
            const photoBase64 = document.getElementById('employeePhotoBase64').value;
            
            if (editId) {
                // Update existing employee
                const employeeIndex = employees.findIndex(emp => emp.id == editId);
                if (employeeIndex !== -1) {
                    const oldEmployee = employees[employeeIndex];
                    employees[employeeIndex] = {
                        ...oldEmployee,
                        name: document.getElementById('employeeName').value,
                        idNumber: document.getElementById('employeeIdNumber').value,
                        phone: document.getElementById('employeePhone').value,
                        email: document.getElementById('employeeEmail').value,
                        birthDate: document.getElementById('employeeBirthDate').value,
                        gender: document.getElementById('employeeGender').value,
                        familyNumber: document.getElementById('employeeFamilyNumber').value,
                        maritalStatus: document.getElementById('employeeMaritalStatus').value,
                        position: document.getElementById('employeePosition').value,
                        department: document.getElementById('employeeDepartment').value,
                        address: document.getElementById('employeeAddress').value,
                        employeeType: document.getElementById('employeeType').value,
                        salary: parseInt(document.getElementById('employeeSalary').value),
                        status: document.getElementById('employeeStatus').value,
                        joinDate: document.getElementById('employeeJoinDate').value,
                        photo: photoBase64 || oldEmployee.photo
                    };
                    
                    saveEmployees();
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'));
                    modal.hide();
                    
                    // Reload employees if on employees page
                    if (currentPage === 'employees') {
                        loadEmployees();
                    }
                    
                    // Log activity
                    logActivity('تحديث موظف', `تم تحديث بيانات الموظف: ${employees[employeeIndex].name}`);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'تم التحديث',
                        text: 'تم تحديث بيانات الموظف بنجاح',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            } else {
                // Add new employee
                const newEmployee = {
                    id: employees.length > 0 ? Math.max(...employees.map(emp => emp.id)) + 1 : 1,
                    name: document.getElementById('employeeName').value,
                    idNumber: document.getElementById('employeeIdNumber').value,
                    phone: document.getElementById('employeePhone').value,
                    email: document.getElementById('employeeEmail').value,
                    birthDate: document.getElementById('employeeBirthDate').value,
                    gender: document.getElementById('employeeGender').value,
                    familyNumber: document.getElementById('employeeFamilyNumber').value,
                    maritalStatus: document.getElementById('employeeMaritalStatus').value,
                    position: document.getElementById('employeePosition').value,
                    department: document.getElementById('employeeDepartment').value,
                    address: document.getElementById('employeeAddress').value,
                    employeeType: document.getElementById('employeeType').value,
                    salary: parseInt(document.getElementById('employeeSalary').value),
                    status: document.getElementById('employeeStatus').value,
                    joinDate: document.getElementById('employeeJoinDate').value,
                    photo: photoBase64
                };
                
                employees.push(newEmployee);
                saveEmployees();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'));
                modal.hide();
                
                // Reload employees if on employees page
                if (currentPage === 'employees') {
                    loadEmployees();
                }
                
                // Log activity
                logActivity('إضافة موظف', `تم إضافة موظف جديد: ${newEmployee.name}`);
                
                Swal.fire({
                    icon: 'success',
                    title: 'تم الإضافة',
                    text: 'تم إضافة الموظف بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }
        
        // Load employees (for managers/admins) with search, filter and pagination
        function loadEmployees() {
            const container = document.getElementById('employeesContainer');
            const paginationContainer = document.getElementById('employeesPagination');
            
            if (!container) return;
            
            container.innerHTML = '';
            paginationContainer.innerHTML = '';
            
            // Filter employees based on user role and search criteria
            let filteredEmployees = employees;
            
            // Apply role-based filtering
            if (currentUser.role === 'manager') {
                // Managers can only see employees in their department
                const managerEmployee = employees.find(emp => emp.id === currentUser.employeeId);
                if (managerEmployee) {
                    filteredEmployees = employees.filter(emp => emp.department === managerEmployee.department);
                }
            }
            
            // Apply search filter
            if (employeeSearchTerm) {
                filteredEmployees = filteredEmployees.filter(emp => 
                    emp.name.toLowerCase().includes(employeeSearchTerm) ||
                    emp.position.toLowerCase().includes(employeeSearchTerm) ||
                    emp.department.toLowerCase().includes(employeeSearchTerm) ||
                    emp.email.toLowerCase().includes(employeeSearchTerm)
                );
            }
            
            // Apply status filter
            if (employeeStatusFilter) {
                filteredEmployees = filteredEmployees.filter(emp => 
                    emp.status === employeeStatusFilter
                );
            }
            
            // Apply type filter
            if (employeeTypeFilter && employeeTypeFilter !== 'all') {
                filteredEmployees = filteredEmployees.filter(emp => 
                    emp.employeeType === employeeTypeFilter
                );
            }
            
            // Sort employees by name
            filteredEmployees.sort((a, b) => a.name.localeCompare(b.name));
            
            // Calculate pagination
            const totalItems = filteredEmployees.length;
            const totalPages = Math.ceil(totalItems / 6); // 6 items per page for card view
            const startIndex = (currentEmployeePage - 1) * 6;
            const endIndex = Math.min(startIndex + 6, totalItems);
            const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
            
            if (paginatedEmployees.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="service-card text-center">
                            <h3>لا توجد موظفين</h3>
                            <p>لم يتم العثور على أي موظفين</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Display employees
            paginatedEmployees.forEach((employee, index) => {
                const statusClass = getStatusClass(employee.status);
                const statusText = getStatusText(employee.status);
                const employeeTypeClass = getEmployeeTypeClass(employee.employeeType);
                const employeeTypeText = getEmployeeTypeText(employee.employeeType);
                
                const employeeCard = `
                    <div class="col-md-6" data-aos="fade-up" data-aos-delay="${index * 100}">
                        <div class="employee-card">
                            <div class="employee-header">
                                ${employee.photo ? 
                                    `<img src="${employee.photo}" class="employee-avatar" alt="${employee.name}">` :
                                    `<div class="employee-avatar" style="background: ${getGradientForUser(employee.id)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                                        ${employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>`
                                }
                                <div class="employee-info">
                                    <div class="employee-name">${employee.name}</div>
                                    <div class="employee-position">${employee.position} - ${employee.department}</div>
                                    <div class="d-flex gap-2">
                                        <span class="employee-status ${statusClass}">${statusText}</span>
                                        <span class="employee-type-badge ${employeeTypeClass}">${employeeTypeText}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="employee-details">
                                <div class="detail-item">
                                    <div class="detail-label">رقم الهوية</div>
                                    <div class="detail-value">${employee.idNumber}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">رقم الهاتف</div>
                                    <div class="detail-value">${employee.phone}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">البريد الإلكتروني</div>
                                    <div class="detail-value">${employee.email}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">الراتب</div>
                                    <div class="detail-value">${formatCurrency(employee.salary)}</div>
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <button class="btn btn-primary btn-sm" onclick="editEmployee(${employee.id})">تعديل</button>
                                <button class="btn btn-info btn-sm" onclick="viewEmployeeDetails(${employee.id})">تفاصيل</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${employee.id})">حذف</button>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += employeeCard;
            });
            
            // Generate pagination
            generatePagination(paginationContainer, currentEmployeePage, totalPages, 'employees');
        }
        
        // Generate pagination controls
        function generatePagination(container, currentPage, totalPages, type) {
            if (totalPages <= 1) return;
            
            container.innerHTML = '';
            
            // Previous button
            const prevButton = document.createElement('div');
            prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
            prevButton.innerHTML = '<i class="bi bi-chevron-right"></i>';
            prevButton.onclick = currentPage > 1 ? () => changePage(type, currentPage - 1) : null;
            container.appendChild(prevButton);
            
            // Page numbers
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, startPage + 4);
            
            for (let i = startPage; i <= endPage; i++) {
                const pageNumber = document.createElement('div');
                pageNumber.className = `pagination-number ${i === currentPage ? 'active' : ''}`;
                pageNumber.textContent = i;
                pageNumber.onclick = () => changePage(type, i);
                container.appendChild(pageNumber);
            }
            
            // Next button
            const nextButton = document.createElement('div');
            nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
            nextButton.innerHTML = '<i class="bi bi-chevron-left"></i>';
            nextButton.onclick = currentPage < totalPages ? () => changePage(type, currentPage + 1) : null;
            container.appendChild(nextButton);
            
            // Page info
            const pageInfo = document.createElement('div');
            pageInfo.className = 'page-info';
            pageInfo.textContent = `الصفحة ${currentPage} من ${totalPages}`;
            container.appendChild(pageInfo);
        }
        
        // Change page for pagination
        function changePage(type, page) {
            switch (type) {
                case 'employees':
                    currentEmployeePage = page;
                    loadEmployees();
                    break;
                case 'myDiscounts':
                    currentMyDiscountPage = page;
                    loadMyDiscounts();
                    break;
                case 'discounts':
                    currentDiscountPage = page;
                    loadDiscounts();
                    break;
                case 'contracts':
                    currentContractPage = page;
                    loadContracts();
                    break;
                case 'vehicles':
                    currentVehiclePage = page;
                    loadVehicles();
                    break;
                case 'myRatings':
                    currentMyRatingPage = page;
                    loadMyRatings();
                    break;
                case 'ratings':
                    currentRatingPage = page;
                    loadRatings();
                    break;
                case 'users':
                    currentUserPage = page;
                    loadUsersTable();
                    break;
            }
            
            // Scroll to top of the container
            const container = document.querySelector(`#${type}Page .service-card`);
            if (container) {
                container.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // Load my info
        function loadMyInfo() {
            const container = document.getElementById('myInfoContainer');
            if (!container) return;
            
            // Find employee data for current user
            const employee = employees.find(emp => 
                currentUser.employeeId ? emp.id === currentUser.employeeId : emp.email === currentUser.email
            );
            
            if (!employee) {
                container.innerHTML = `
                    <div class="service-card" data-aos="fade-up">
                        <h3>لا توجد معلومات شخصية</h3>
                        <p>لم يتم العثور على معلومات موظف مرتبطة بحسابك.</p>
                    </div>
                `;
                return;
            }
            
            const statusClass = getStatusClass(employee.status);
            const statusText = getStatusText(employee.status);
            const employeeTypeClass = getEmployeeTypeClass(employee.employeeType);
            const employeeTypeText = getEmployeeTypeText(employee.employeeType);
            
            container.innerHTML = `
                <div class="service-card" data-aos="fade-up">
                    <div class="employee-header">
                        ${employee.photo ? 
                            `<img src="${employee.photo}" class="employee-avatar" alt="${employee.name}">` :
                            `<div class="employee-avatar" style="background: ${getGradientForUser(employee.id)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                                ${employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>`
                        }
                        <div class="employee-info">
                            <div class="employee-name">${employee.name}</div>
                            <div class="employee-position">${employee.position} - ${employee.department}</div>
                            <div class="d-flex gap-2">
                                <span class="employee-status ${statusClass}">${statusText}</span>
                                <span class="employee-type-badge ${employeeTypeClass}">${employeeTypeText}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="employee-details">
                        <div class="detail-item">
                            <div class="detail-label">رقم الهوية</div>
                            <div class="detail-value">${employee.idNumber}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">رقم الهاتف</div>
                            <div class="detail-value">${employee.phone}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">البريد الإلكتروني</div>
                            <div class="detail-value">${employee.email}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">رقم العائلة</div>
                            <div class="detail-value">${employee.familyNumber}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">الحالة الاجتماعية</div>
                            <div class="detail-value">${employee.maritalStatus}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">الجنس</div>
                            <div class="detail-value">${employee.gender}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">تاريخ الميلاد</div>
                            <div class="detail-value">${formatDate(employee.birthDate)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">تاريخ التعيين</div>
                            <div class="detail-value">${formatDate(employee.joinDate)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">الراتب الأساسي</div>
                            <div class="detail-value">${formatCurrency(employee.salary)}</div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <h4>العنوان</h4>
                        <p>${employee.address}</p>
                    </div>
                    
                    ${hasPermission('myInfo','edit') ? `
                    <div class="mt-4">
                        <button class="btn btn-primary" onclick="editMyInfo(${employee.id})">تعديل المعلومات</button>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Edit my info
        function editMyInfo(employeeId) {
            const employee = employees.find(emp => emp.id === employeeId);
            if (!employee) return;
            
            // Fill form with employee data
            document.getElementById('myInfoEmployeeId').value = employee.id;
            document.getElementById('myInfoPhone').value = employee.phone;
            document.getElementById('myInfoEmail').value = employee.email;
            document.getElementById('myInfoFamilyNumber').value = employee.familyNumber;
            document.getElementById('myInfoMaritalStatus').value = employee.maritalStatus;
            document.getElementById('myInfoAddress').value = employee.address;
            
            const modal = new bootstrap.Modal(document.getElementById('editMyInfoModal'));
            modal.show();
        }
        
        // Update my info
        function updateMyInfo() {
            const employeeId = document.getElementById('myInfoEmployeeId').value;
            const employeeIndex = employees.findIndex(emp => emp.id == employeeId);
            
            if (employeeIndex !== -1) {
                employees[employeeIndex] = {
                    ...employees[employeeIndex],
                    phone: document.getElementById('myInfoPhone').value,
                    email: document.getElementById('myInfoEmail').value,
                    familyNumber: document.getElementById('myInfoFamilyNumber').value,
                    maritalStatus: document.getElementById('myInfoMaritalStatus').value,
                    address: document.getElementById('myInfoAddress').value
                };
                
                saveEmployees();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('editMyInfoModal'));
                modal.hide();
                
                // Reload my info
                loadMyInfo();
                
                // Log activity
                logActivity('تحديث معلومات شخصية', `تم تحديث المعلومات الشخصية`);
                
                Swal.fire({
                    icon: 'success',
                    title: 'تم التحديث',
                    text: 'تم تحديث معلوماتك الشخصية بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }

        // Toggle user menu
        function toggleUserMenu() {
            const menu = document.getElementById('userMenu');
            menu.classList.toggle('show');
            
            // Close menu when clicking outside
            document.addEventListener('click', function closeMenu(e) {
                if (!e.target.closest('.user-dropdown')) {
                    menu.classList.remove('show');
                    document.removeEventListener('click', closeMenu);
                }
            });
        }

        // Toggle notifications panel
        function toggleNotifPanel(){
            const wrap = document.getElementById('notifPanelWrapper');
            if(!wrap) return;
            wrap.classList.toggle('open');
            renderNotifDropdown();
            updateNavNotifBadge();
            // close when clicking outside
            document.addEventListener('click', function closeNotif(e){
                if (!e.target.closest('#notifPanelWrapper') && !e.target.closest('[onclick*=toggleNotifPanel]')) {
                    wrap.classList.remove('open');
                    document.removeEventListener('click', closeNotif);
                }
            });
        }

// Initialize on page load
        window.addEventListener('DOMContentLoaded', function() {
            // Global error handler (helps show a friendly message instead of failing silently)
            window.addEventListener('error', function(ev){
                try{
                    const loginVisible = document.getElementById('loginPage') && document.getElementById('loginPage').style.display !== 'none';
                    const msg = 'صار خطأ غير متوقع داخل الموقع. إذا استمر، أرسل لقطة شاشة للخطأ.';
                    if (loginVisible) setLoginInlineAlert('danger', msg);
                    if (window.Swal) {
                        Swal.fire({ icon:'error', title:'خطأ', text: msg });
                    }
                }catch(_){}
            });

            initData();
            checkAuth();
            // Google Sign-In button (public)
            initGoogleSignIn();

            // Force all digits in the UI to English (0-9)
            initEnglishDigits();
            
            // Theme
            try { initTheme(); } catch (_) {}

            // Messaging: poll local storage (supports multiple tabs / multiple users on same machine)
            setInterval(()=>{
                try{
                    if(!currentUser || currentUser.role==='guest') return;
                    messagesStore = JSON.parse(localStorage.getItem('smartEraMessages')||'[]');
                    updateNavMessageBadge();
                    maybeNotifyNewMessage();
                    // if messages page is active, keep it fresh
                    const msgPage = document.getElementById('messagesPage');
                    if(msgPage && msgPage.classList.contains('active')){
                        renderMessageThreads();
                        renderMessageView();
                    }
                }catch(_){ }
            }, 4500);

            // NOTE: In-page color editor was removed; keep the brand palette stable.
            // (We intentionally do NOT override CSS variables from localStorage here.)
            
            // Set up image upload button
            document.getElementById('employeePhotoUpload').addEventListener('change', previewEmployeePhoto);

            // Register form
            const registerForm = document.getElementById('registerForm');
            if (registerForm) {
                registerForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    registerNewUser();
                });
            }
        });

        /* -------------------------------------------------------------------------- */
        /*                          English Digits (0-9)                               */
        /* -------------------------------------------------------------------------- */

        // Convert Arabic-Indic and Eastern Arabic-Indic digits to English digits
        function toEnglishDigits(value) {
            if (value === null || value === undefined) return value;
            const str = String(value);
            const map = {
                '٠': '0','١': '1','٢': '2','٣': '3','٤': '4','٥': '5','٦': '6','٧': '7','٨': '8','٩': '9',
                '۰': '0','۱': '1','۲': '2','۳': '3','۴': '4','۵': '5','۶': '6','۷': '7','۸': '8','۹': '9'
            };
            return str.replace(/[٠-٩۰-۹]/g, d => map[d] ?? d);
        }

        function normalizeDigitsInElement(root) {
            if (!root) return;

            // Normalize inputs (so typing Arabic digits becomes English)
            const inputs = root.querySelectorAll ? root.querySelectorAll('input, textarea') : [];
            inputs.forEach(el => {
                if (el.__digitsBound) return;
                el.__digitsBound = true;
                el.addEventListener('input', () => {
                    const v = el.value;
                    const nv = toEnglishDigits(v);
                    if (nv !== v) {
                        const pos = el.selectionStart;
                        el.value = nv;
                        try { el.setSelectionRange(pos, pos); } catch (_) {}
                    }
                });
            });

            // Normalize visible text nodes
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
                    // Ignore script/style
                    const p = node.parentNode;
                    if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return NodeFilter.FILTER_REJECT;
                    return /[٠-٩۰-۹]/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });

            let n;
            while ((n = walker.nextNode())) {
                const v = n.nodeValue;
                const nv = toEnglishDigits(v);
                if (nv !== v) n.nodeValue = nv;
            }
        }

        function initEnglishDigits() {
            // First pass
            normalizeDigitsInElement(document.body);

            // Keep normalizing for dynamic updates
            const obs = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.type === 'characterData' && m.target && m.target.nodeValue) {
                        const v = m.target.nodeValue;
                        const nv = toEnglishDigits(v);
                        if (nv !== v) m.target.nodeValue = nv;
                    }
                    if (m.addedNodes && m.addedNodes.length) {
                        m.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                normalizeDigitsInElement(node);
                            } else if (node.nodeType === 3 && node.nodeValue) {
                                const v = node.nodeValue;
                                const nv = toEnglishDigits(v);
                                if (nv !== v) node.nodeValue = nv;
                            }
                        });
                    }
                }
            });
            obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        }

        /* -------------------------------------------------------------------------- */
        /*                               Public Register                              */
        /* -------------------------------------------------------------------------- */

        function showRegisterModal() {
            const modalEl = document.getElementById('registerModal');
            if (!modalEl) return;
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }

        function registerNewUser() {
            const name = (document.getElementById('registerName')?.value || '').trim();
            const email = (document.getElementById('registerEmail')?.value || '').trim().toLowerCase();
            const password = document.getElementById('registerPassword')?.value || '';

            if (!email || !password) {
                Swal.fire({ icon: 'warning', title: 'نقص بالبيانات', text: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
                return;
            }

            const existing = users.find(u => u.email.toLowerCase() === email);
            if (existing) {
                Swal.fire({ icon: 'error', title: 'مستخدم موجود', text: 'هذا البريد الإلكتروني مسجل مسبقاً' });
                return;
            }

            const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
            const newUser = {
                id: newId,
                name: name || email.split('@')[0],
                email,
                phone: '',
                password,
                role: 'guest',
                employeeId: null,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                active: true
            };

            users.push(newUser);
            saveUsers();

            // Auto-login as guest
            currentUser = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                employeeId: null,
                createdAt: newUser.createdAt,
                lastLogin: newUser.lastLogin
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            if (modal) modal.hide();

            // Reset
            document.getElementById('registerForm')?.reset();

            showMainApp();
            showPage('jobs');

            Swal.fire({
                icon: 'success',
                title: 'تم إنشاء الحساب',
                text: 'تم إنشاء حسابك بنجاح. يمكنك الآن مشاهدة معلومات الشركة والتقديم على الوظائف.',
                timer: 2200,
                showConfirmButton: false
            });
        }

        /* -------------------------------------------------------------------------- */
        /*                           Company Instructions Page                         */
        // Render instructions content:
// - If content contains HTML tags -> render as-is
// - Otherwise support bullet lines starting with (-) or (•)
function renderInstructionsContent(content) {
    const s = String(content || '').trim();
    if (!s) return '';
    if (/<\w+[\s>]/.test(s)) return s;

    const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bullets = [];
    const paras = [];

    for (const line of lines) {
        if (line.startsWith('- ') || line.startsWith('• ')) {
            bullets.push(line.replace(/^(-\s+|•\s+)/, ''));
        } else {
            paras.push(line);
        }
    }

    let html = '';
    if (paras.length) html += paras.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    if (bullets.length) html += `<ul class="instructions-list">` + bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('') + `</ul>`;
    return html;
}

// Remove saved profile avatar (image)
function removeProfileAvatar(){
    try{
        const user = getCurrentUser?.();
        if(!user){ appNotify('error','الصورة','يجب تسجيل الدخول'); return; }
        const updated = { ...user };
        delete updated.avatar;
        updated.updatedAt = new Date().toISOString();

        const idx = (users||[]).findIndex(u => String(u.id)===String(user.id));
        if(idx>=0) users[idx] = updated;
        try{ localStorage.setItem('users', JSON.stringify(users)); }catch(_){ }
        try{ localStorage.setItem('currentUser', JSON.stringify(updated)); }catch(_){ }

        currentUser = updated;
        updateUIForUser();
        loadProfile();
        appNotify('success','تم','تم حذف الصورة', 2000);
    }catch(err){
        console.warn('removeProfileAvatar error', err);
        appNotify('error','الصورة','صار خطأ أثناء الحذف');
    }
}

function ensureInstructionsToolbar() {
    const editor = document.getElementById('instructionsEditor');
    if (!editor) return;
    if (document.getElementById('instructionsToolbar')) return;

    const wrap = document.createElement('div');
    wrap.id = 'instructionsToolbar';
    wrap.className = 'instructions-toolbar mb-2';
    wrap.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="insertInstructionBullet()"><i class="bi bi-list-ul"></i> نقطة</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="insertInstructionNumber()"><i class="bi bi-list-ol"></i> ترقيم</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="insertInstructionHeading()"><i class="bi bi-type-h3"></i> عنوان</button>
        <span class="text-muted ms-2" style="font-size:12px;">اكتب النقاط سطر بسطر</span>
    `;

    editor.parentElement.insertBefore(wrap, editor);
}

function _insertAtCursor(el, text) {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const val = el.value || '';
    el.value = val.slice(0, start) + text + val.slice(end);
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
    el.focus();
}

function _ensureNewLine(el) {
    const v = el.value || '';
    return v && !v.endsWith('\n') ? '\n' : '';
}

function insertInstructionBullet() {
    const el = document.getElementById('instructionsEditor');
    if (!el) return;
    _insertAtCursor(el, _ensureNewLine(el) + '- ');
}

function insertInstructionNumber() {
    const el = document.getElementById('instructionsEditor');
    if (!el) return;
    // find last numbered item
    const lines = (el.value || '').split(/\r?\n/);
    let n = 1;
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(/^\s*(\d+)\./);
        if (m) { n = parseInt(m[1], 10) + 1; break; }
    }
    _insertAtCursor(el, _ensureNewLine(el) + `${n}. `);
}

function insertInstructionHeading() {
    const el = document.getElementById('instructionsEditor');
    if (!el) return;
    _insertAtCursor(el, _ensureNewLine(el) + '### ');
}

function loadInstructionsPage(selectedId = null) {
            const tabsEl = document.getElementById('instructionsTabs');
            const contentEl = document.getElementById('instructionsContent');
            const editorEl = document.getElementById('instructionsEditor');
            const titleEl = document.getElementById('instructionsEditorTitle');
            const saveBtn = document.getElementById('saveInstructionsBtn');
            const editorCard = document.getElementById('instructionsEditorCard');
            const adminActions = document.getElementById('instructionsAdminActions');

            if (!tabsEl || !contentEl || !editorEl || !titleEl) return;

            const isAdmin = currentUser && currentUser.role === 'admin';
            if (adminActions) adminActions.style.display = isAdmin ? '' : 'none';
            if (editorCard) editorCard.style.display = isAdmin ? '' : 'none';
            if (saveBtn) saveBtn.style.display = isAdmin ? '' : 'none';

            if (!instructionPages || !instructionPages.length) {
                instructionPages = [{ id: 1, title: 'مقدمة', content: '<p>لا توجد تعليمات بعد.</p>' }];
                saveInstructions();
            }

            const activeId = selectedId || parseInt(tabsEl.getAttribute('data-active') || '', 10) || instructionPages[0].id;
            const activePage = instructionPages.find(p => p.id === activeId) || instructionPages[0];
            tabsEl.setAttribute('data-active', String(activePage.id));

            // Render tabs
            tabsEl.innerHTML = instructionPages.map(p => `
                <button class="list-group-item list-group-item-action ${p.id === activePage.id ? 'active' : ''}" onclick="selectInstructionPage(${p.id})">
                    <i class="bi bi-file-earmark-text me-2"></i>${escapeHtml(p.title)}
                </button>
            `).join('');

            // Render content
            contentEl.innerHTML = `
                <div class="service-card">
                    <h3 class="mb-3">${escapeHtml(activePage.title)}</h3>
                    <div class="instructions-rendered">${renderInstructionsContent(activePage.content || '')}</div>
                </div>
            `;

            // Admin editor
            if (isAdmin) {
                ensureInstructionsToolbar();
                titleEl.value = activePage.title;
                editorEl.value = activePage.content || '';
            }
        }

        function selectInstructionPage(id) {
            loadInstructionsPage(id);
        }

        function addInstructionPage() {
            if (!currentUser || currentUser.role !== 'admin') return;

            Swal.fire({
                title: 'إضافة صفحة تعليمات',
                input: 'text',
                inputLabel: 'عنوان الصفحة',
                inputPlaceholder: 'مثال: سياسة الإجازات',
                showCancelButton: true,
                confirmButtonText: 'إضافة',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (!result.isConfirmed) return;
                const title = (result.value || '').trim();
                if (!title) return;

                const newId = instructionPages.length ? Math.max(...instructionPages.map(p => p.id)) + 1 : 1;
                instructionPages.push({ id: newId, title, content: '<p>اكتب محتوى التعليمات هنا...</p>' });
                saveInstructions();
                logActivity('إضافة تعليمات', `تم إضافة صفحة تعليمات: ${title}`, 'instructions');
                loadInstructionsPage(newId);
            });
        }

        function deleteInstructionPage() {
            if (!currentUser || currentUser.role !== 'admin') return;

            const tabsEl = document.getElementById('instructionsTabs');
            const activeId = parseInt(tabsEl?.getAttribute('data-active') || '0', 10);
            const activePage = instructionPages.find(p => p.id === activeId);
            if (!activePage) return;

            if (instructionPages.length <= 1) {
                Swal.fire({ icon: 'warning', title: 'غير ممكن', text: 'يجب أن تبقى صفحة واحدة على الأقل' });
                return;
            }

            Swal.fire({
                icon: 'warning',
                title: 'حذف الصفحة؟',
                text: `سيتم حذف صفحة: ${activePage.title}`,
                showCancelButton: true,
                confirmButtonText: 'حذف',
                cancelButtonText: 'إلغاء'
            }).then(res => {
                if (!res.isConfirmed) return;
                instructionPages = instructionPages.filter(p => p.id !== activeId);
                saveInstructions();
                logActivity('حذف تعليمات', `تم حذف صفحة تعليمات: ${activePage.title}`, 'instructions');
                loadInstructionsPage(instructionPages[0].id);
            });
        }

        function saveInstructionEdits() {
            if (!currentUser || currentUser.role !== 'admin') return;

            const tabsEl = document.getElementById('instructionsTabs');
            const activeId = parseInt(tabsEl?.getAttribute('data-active') || '0', 10);
            const title = (document.getElementById('instructionsEditorTitle')?.value || '').trim();
            const content = document.getElementById('instructionsEditor')?.value || '';

            const idx = instructionPages.findIndex(p => p.id === activeId);
            if (idx === -1) return;

            instructionPages[idx] = { ...instructionPages[idx], title: title || instructionPages[idx].title, content };
            saveInstructions();
            logActivity('تعديل تعليمات', `تم حفظ تعديلات تعليمات: ${instructionPages[idx].title}`, 'instructions');
            loadInstructionsPage(activeId);

            Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1200, showConfirmButton: false });
        }

        /* -------------------------------------------------------------------------- */
        /*                               Users Management                               */
        /* -------------------------------------------------------------------------- */

        function setupUsersSearch() {
            const searchInput = document.getElementById('usersSearch');
            const roleFilter = document.getElementById('usersRoleFilter');
            const statusFilter = document.getElementById('usersStatusFilter');

            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    usersSearchTerm = this.value.toLowerCase();
                    currentUserPage = 1;
                    loadUsersTable();
                });
            }
            if (roleFilter) {
                roleFilter.addEventListener('change', function() {
                    usersRoleFilter = this.value;
                    currentUserPage = 1;
                    loadUsersTable();
                });
            }
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    usersStatusFilter = this.value;
                    currentUserPage = 1;
                    loadUsersTable();
                });
            }
        }

        function loadUsersTable() {
            const tbody = document.getElementById('usersTableBody');
            const paginationEl = document.getElementById('usersPagination');
            if (!tbody) return;

            // Filter
            let filtered = [...users];
            if (usersSearchTerm) {
                filtered = filtered.filter(u =>
                    (u.name || '').toLowerCase().includes(usersSearchTerm) ||
                    (u.email || '').toLowerCase().includes(usersSearchTerm)
                );
            }
            if (usersRoleFilter) {
                filtered = filtered.filter(u => u.role === usersRoleFilter);
            }
            if (usersStatusFilter) {
                const wantedActive = usersStatusFilter === 'active';
                filtered = filtered.filter(u => (u.active === true) === wantedActive);
            }

            // Sort newest first
            filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            // Pagination
            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
            if (currentUserPage > totalPages) currentUserPage = totalPages;
            const start = (currentUserPage - 1) * itemsPerPage;
            const pageItems = filtered.slice(start, start + itemsPerPage);

            tbody.innerHTML = pageItems.map(u => {
                const emp = u.employeeId ? employees.find(e => e.id === u.employeeId) : null;
                const statusBadge = u.active ? '<span class="status-badge status-active">نشط</span>' : '<span class="status-badge status-inactive">غير نشط</span>';
                return `
                    <tr>
                        <td>${escapeHtml(u.name || '')}</td>
                        <td>${escapeHtml(u.email || '')}</td>
                        <td>${escapeHtml(u.phone || '')}</td>
                        <td>${escapeHtml(getRoleName(u.role))} ${u.role === 'guest' ? statusBadge : ''}</td>
                        <td>${emp ? escapeHtml(emp.name) : '-'}</td>
                        <td>${formatDate(u.createdAt)}</td>
                        <td>
                            <div class="d-flex gap-2 flex-wrap">
                                <button class="btn btn-sm btn-primary" onclick="editUser(${u.id})"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-sm btn-${u.active ? 'warning' : 'success'}" onclick="toggleUserStatus(${u.id})"><i class="bi bi-${u.active ? 'pause' : 'play'}"></i></button>
                                <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="bi bi-trash"></i></button>
                                <button class="btn btn-sm btn-secondary" onclick="resetUserPassword(${u.id})"><i class="bi bi-key"></i></button>
                                <button class="btn btn-sm btn-outline-dark" onclick="openPermissionsForUser(${u.id})" title="صلاحيات"><i class="bi bi-shield-lock"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Pagination UI
            if (paginationEl) {
                paginationEl.innerHTML = renderPagination(totalPages, currentUserPage, (p) => `goToUsersPage(${p})`);
            }
        }

        function goToUsersPage(page) {
            currentUserPage = page;
            loadUsersTable();
        }

        function openPermissionsForUser(userId) {
            if (!currentUser || currentUser.role !== 'admin') return;
            selectedUserPermissionsId = userId;
            showPage('permissions');
            // loadUserPermissionsManager will keep the selection
        }

        function showAddUserModal() {
            if (!currentUser || currentUser.role !== 'admin') {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'هذه الصفحة للمسؤول فقط' });
                return;
            }

            document.getElementById('userModalTitle').textContent = 'إضافة مستخدم جديد';
            document.getElementById('userEditId').value = '';
            document.getElementById('addUserForm')?.reset();

            // Populate employee dropdown
            const employeeSelect = document.getElementById('userEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
            }

            const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
            modal.show();
        }

        function editUser(userId) {
            if (!currentUser || currentUser.role !== 'admin') return;
            const user = users.find(u => u.id === userId);
            if (!user) return;

            document.getElementById('userModalTitle').textContent = 'تعديل المستخدم';
            document.getElementById('userEditId').value = user.id;
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userPassword').value = user.password || '';
            document.getElementById('userRole').value = user.role || 'employee';

            const employeeSelect = document.getElementById('userEmployeeId');
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
                employeeSelect.value = user.employeeId || '';
            }

            const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
            modal.show();
        }

        function saveUser() {
            if (!currentUser || currentUser.role !== 'admin') return;

            const editId = document.getElementById('userEditId').value;
            const name = (document.getElementById('userName').value || '').trim();
            const email = (document.getElementById('userEmail').value || '').trim().toLowerCase();
            const password = document.getElementById('userPassword').value || '';
            const role = document.getElementById('userRole').value;
            const employeeIdVal = document.getElementById('userEmployeeId').value;
            const employeeId = employeeIdVal ? parseInt(employeeIdVal, 10) : null;

            if (!name || !email || !password || !role) {
                Swal.fire({ icon: 'warning', title: 'نقص بالبيانات', text: 'يرجى ملء جميع الحقول المطلوبة' });
                return;
            }

            const emailTakenByOther = users.find(u => u.email.toLowerCase() === email && String(u.id) !== String(editId));
            if (emailTakenByOther) {
                Swal.fire({ icon: 'error', title: 'البريد موجود', text: 'هذا البريد مستخدم من قبل مستخدم آخر' });
                return;
            }

            if (editId) {
                const idx = users.findIndex(u => String(u.id) === String(editId));
                if (idx === -1) return;
                users[idx] = { ...users[idx], name, email, password, role, employeeId };
                logActivity('تعديل مستخدم', `تم تعديل المستخدم: ${name}`, 'users');
            } else {
                const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
                users.push({
                    id: newId,
                    name,
                    email,
                    phone: '',
                    password,
                    role,
                    employeeId,
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    active: true
                });
                logActivity('إضافة مستخدم', `تم إضافة مستخدم جديد: ${name}`, 'users');
            }

            saveUsers();
            loadUsersTable();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
            if (modal) modal.hide();

            Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1200, showConfirmButton: false });
        }

        function toggleUserStatus(userId) {
            if (!currentUser || currentUser.role !== 'admin') return;
            const user = users.find(u => u.id === userId);
            if (!user) return;

            if (user.role === 'admin' && user.id === 1) {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'لا يمكن تعطيل الحساب الرئيسي' });
                return;
            }

            user.active = !user.active;
            saveUsers();
            loadUsersTable();
            logActivity('تغيير حالة مستخدم', `تم ${user.active ? 'تفعيل' : 'تعطيل'} المستخدم: ${user.name}`, 'users');
        }

        function deleteUser(userId) {
            if (!currentUser || currentUser.role !== 'admin') return;
            const user = users.find(u => u.id === userId);
            if (!user) return;

            if (user.role === 'admin' && user.id === 1) {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'لا يمكن حذف الحساب الرئيسي' });
                return;
            }

            Swal.fire({
                icon: 'warning',
                title: 'حذف المستخدم؟',
                text: `سيتم حذف المستخدم: ${user.name}`,
                showCancelButton: true,
                confirmButtonText: 'حذف',
                cancelButtonText: 'إلغاء'
            }).then(res => {
                if (!res.isConfirmed) return;
                users = users.filter(u => u.id !== userId);
                saveUsers();
                loadUsersTable();
                logActivity('حذف مستخدم', `تم حذف المستخدم: ${user.name}`, 'users');
                Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
            });
        }

        function resetUserPassword(userId) {
            if (!currentUser || currentUser.role !== 'admin') return;
            const user = users.find(u => u.id === userId);
            if (!user) return;

            Swal.fire({
                title: 'تعيين كلمة مرور جديدة',
                input: 'password',
                inputLabel: `للمستخدم: ${user.name}`,
                inputPlaceholder: 'أدخل كلمة مرور جديدة',
                showCancelButton: true,
                confirmButtonText: 'حفظ',
                cancelButtonText: 'إلغاء'
            }).then(res => {
                if (!res.isConfirmed) return;
                const pwd = (res.value || '').trim();
                if (!pwd) return;
                user.password = pwd;
                saveUsers();
                logActivity('تغيير كلمة مرور', `تم تغيير كلمة مرور المستخدم: ${user.name}`, 'users');
                Swal.fire({ icon: 'success', title: 'تم التحديث', timer: 1200, showConfirmButton: false });
            });
        }

        // -----------------------------
        // Permissions page (roles + per-user overrides)
        // -----------------------------
        const pageLabelsAr = {
            home: 'الصفحة الرئيسية',
            about: 'عن الشركة',
            jobs: 'الوظائف',
            instructions: 'تعليمات الشركة',
            myInfo: 'معلوماتي',
            employees: 'الموظفين',
            myDiscounts: 'خصوماتي',
            discounts: 'الخصومات',
            myContract: 'عقدي',
            contracts: 'العقود',
            myVehicle: 'مركبتي',
            vehicles: 'المركبات',
            myRatings: 'تقييمي',
            ratings: 'التقييمات',
            dashboard: 'لوحة التحكم',
            advancedDashboard: 'داشبورد متقدم',
            users: 'إدارة المستخدمين',
            permissions: 'إدارة الصلاحيات',
            reports: 'التقارير',
            profile: 'الملف الشخصي',
            settings: 'الإعدادات'
        };

        function loadRoles() {
            const container = document.getElementById('rolesContainer');
            if (!container) return;
            // Simple view of roles (can be extended)
            container.innerHTML = roles.map(r => `
                <div class="service-card mb-2">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <div>
                            <h4 class="mb-1">${escapeHtml(r.name)} <small class="text-muted">(${escapeHtml(r.id)})</small></h4>
                            <p class="mb-0 text-muted">${escapeHtml(r.description || '')}</p>
                        </div>
                        <div class="text-muted" style="font-size:.9rem;">${(r.users || []).length} مستخدم</div>
                    </div>
                </div>
            `).join('');
        }

        function loadPagesPermissions() {
            const grid = document.getElementById('pagesPermissions');
            if (!grid) return;

            const roleIds = roles.map(r => r.id);
            const pages = Object.keys(permissions.pages || {}).sort();
            grid.innerHTML = pages.map(pageId => {
                const label = pageLabelsAr[pageId] || pageId;
                const allowed = new Set(permissions.pages[pageId] || []);
                const checkboxes = roleIds.map(roleId => {
                    const checked = allowed.has('all') ? true : allowed.has(roleId);
                    const disabled = allowed.has('all');
                    return `
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="perm_${pageId}_${roleId}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}
                                 onchange="togglePageRolePermission('${pageId}','${roleId}', this.checked)" />
                          <label class="form-check-label" for="perm_${pageId}_${roleId}">${escapeHtml(getRoleName(roleId))}</label>
                        </div>
                    `;
                }).join('');
                return `
                    <div class="service-card">
                      <h4 class="mb-2">${escapeHtml(label)}</h4>
                      ${checkboxes}
                      <small class="text-muted">* Admin يقدر بكلشي افتراضياً. تقدر تخصّص أكثر من قسم "صلاحيات المستخدمين" تحت.</small>
                    </div>
                `;
            }).join('');
        }

        function togglePageRolePermission(pageId, roleId, isAllowed) {
            if (!currentUser || currentUser.role !== 'admin') {
                Swal.fire({ icon: 'warning', title: 'غير مسموح', text: 'هذه الصفحة للمسؤول فقط' });
                loadPagesPermissions();
                return;
            }
            if (!permissions.pages) permissions.pages = {};
            if (!permissions.pages[pageId]) permissions.pages[pageId] = [];

            const arr = new Set(permissions.pages[pageId]);
            if (isAllowed) arr.add(roleId);
            else arr.delete(roleId);
            permissions.pages[pageId] = Array.from(arr);
            savePermissions();
            applyPermissions();
        }

        // Per-user permissions manager
        function loadUserPermissionsManager() {
            if (!currentUser || currentUser.role !== 'admin') return;

            // Show admin-only card
            const card = document.getElementById('userPermissionsManagerCard');
            if (card) card.style.display = '';

            const select = document.getElementById('userPermissionsSelect');
            if (!select) return;

            const copySelect = document.getElementById('copyPermissionsFromSelect');

            // Populate users
            select.innerHTML = '<option value="">اختر المستخدم</option>' + users
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(u => `<option value="${u.id}">${escapeHtml(u.name)} - ${escapeHtml(u.email)}</option>`)
                .join('');

            if (copySelect) {
                copySelect.innerHTML = '<option value="">اختر مصدر النسخ</option>' + users
                    .slice()
                    .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
                    .map(u => `<option value="${u.id}">${escapeHtml(u.name)} - ${escapeHtml(u.email)}</option>`)
                    .join('');
            }

            select.onchange = () => {
                selectedUserPermissionsId = select.value ? parseInt(select.value, 10) : null;
                renderUserPermissionsTable();
            };

            // If already selected, keep
            if (selectedUserPermissionsId) select.value = String(selectedUserPermissionsId);
            renderUserPermissionsTable();
        }

        function selectAllUserPermissions(isChecked) {
            if (!currentUser || currentUser.role !== 'admin') return;
            if (!selectedUserPermissionsId) return;
            const pages = Object.keys(permissions.pages || {});
            pages.forEach(pageId => {
                setUserOverride(selectedUserPermissionsId, pageId, 'view', isChecked);
                setUserOverride(selectedUserPermissionsId, pageId, 'create', isChecked);
                setUserOverride(selectedUserPermissionsId, pageId, 'edit', isChecked);
                setUserOverride(selectedUserPermissionsId, pageId, 'delete', isChecked);
            });
            renderUserPermissionsTable();
        }

        function copyPermissionsFromUser() {
            if (!currentUser || currentUser.role !== 'admin') return;
            if (!selectedUserPermissionsId) {
                Swal.fire({ icon: 'warning', title: 'اختر مستخدم', text: 'اختر المستخدم الذي تريد تعديل صلاحياته أولاً' });
                return;
            }
            const fromId = parseInt(document.getElementById('copyPermissionsFromSelect')?.value || '', 10);
            if (!fromId) return;
            const from = userPermissions?.[fromId];
            userPermissions[selectedUserPermissionsId] = from ? JSON.parse(JSON.stringify(from)) : { pages: {} };
            renderUserPermissionsTable();
            Swal.fire({ icon: 'success', title: 'تم النسخ', timer: 900, showConfirmButton: false });
        }

        function effectiveRoleAllows(userId, pageId, action) {
            const u = users.find(x => x.id === userId);
            if (!u) return false;
            // view
            if (action === 'view') {
                const allowed = permissions?.pages?.[pageId];
                if (!allowed) return true;
                return allowed.includes('all') || allowed.includes(u.role);
            }
            if (u.role === 'admin') return true;
            const actionRoles = permissions?.actions?.[pageId]?.[action];
            if (!actionRoles) return false;
            return actionRoles.includes('all') || actionRoles.includes(u.role);
        }

        function getUserOverride(userId, pageId, action) {
            const o = userPermissions?.[userId]?.pages?.[pageId];
            if (!o) return null;
            return typeof o[action] === 'boolean' ? o[action] : null;
        }

        function setUserOverride(userId, pageId, action, value) {
            if (!userPermissions[userId]) userPermissions[userId] = { pages: {} };
            if (!userPermissions[userId].pages) userPermissions[userId].pages = {};
            if (!userPermissions[userId].pages[pageId]) userPermissions[userId].pages[pageId] = {};
            userPermissions[userId].pages[pageId][action] = !!value;
        }

        function renderUserPermissionsTable() {
            const hint = document.getElementById('userPermissionsHint');
            const wrap = document.getElementById('userPermissionsTableWrap');
            const actions = document.getElementById('userPermissionsActions');
            const tbody = document.getElementById('userPermissionsTableBody');
            if (!hint || !wrap || !actions || !tbody) return;

            if (!selectedUserPermissionsId) {
                hint.style.display = '';
                wrap.style.display = 'none';
                actions.style.display = 'none';
                tbody.innerHTML = '';
                return;
            }

            hint.style.display = 'none';
            wrap.style.display = '';
            actions.style.display = '';

            const pages = Object.keys(permissions.pages || {}).sort();
            tbody.innerHTML = pages.map(pageId => {
                const label = pageLabelsAr[pageId] || pageId;

                const viewVal = getUserOverride(selectedUserPermissionsId, pageId, 'view');
                const createVal = getUserOverride(selectedUserPermissionsId, pageId, 'create');
                const editVal = getUserOverride(selectedUserPermissionsId, pageId, 'edit');
                const deleteVal = getUserOverride(selectedUserPermissionsId, pageId, 'delete');

                const effView = (viewVal === null) ? effectiveRoleAllows(selectedUserPermissionsId, pageId, 'view') : viewVal;
                const effCreate = (createVal === null) ? effectiveRoleAllows(selectedUserPermissionsId, pageId, 'create') : createVal;
                const effEdit = (editVal === null) ? effectiveRoleAllows(selectedUserPermissionsId, pageId, 'edit') : editVal;
                const effDelete = (deleteVal === null) ? effectiveRoleAllows(selectedUserPermissionsId, pageId, 'delete') : deleteVal;

                const cb = (action, checked) => `
                    <input type="checkbox" class="form-check-input" ${checked ? 'checked' : ''}
                           onchange="onUserPermissionChange('${pageId}','${action}', this.checked)" />
                `;

                return `
                    <tr>
                        <td>${escapeHtml(label)}</td>
                        <td class="text-center">${cb('view', effView)}</td>
                        <td class="text-center">${cb('create', effCreate)}</td>
                        <td class="text-center">${cb('edit', effEdit)}</td>
                        <td class="text-center">${cb('delete', effDelete)}</td>
                    </tr>
                `;
            }).join('');
        }

        function onUserPermissionChange(pageId, action, isChecked) {
            if (!currentUser || currentUser.role !== 'admin') return;
            if (!selectedUserPermissionsId) return;
            setUserOverride(selectedUserPermissionsId, pageId, action, isChecked);
        }

        function saveSelectedUserPermissions() {
            if (!currentUser || currentUser.role !== 'admin') return;
            if (!selectedUserPermissionsId) return;
            saveUserPermissions();
            applyPermissions();
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ صلاحيات المستخدم', timer: 1200, showConfirmButton: false });
        }

        function resetSelectedUserPermissions() {
            if (!currentUser || currentUser.role !== 'admin') return;
            if (!selectedUserPermissionsId) return;
            if (userPermissions[selectedUserPermissionsId]) {
                delete userPermissions[selectedUserPermissionsId];
                saveUserPermissions();
            }
            renderUserPermissionsTable();
            applyPermissions();
            Swal.fire({ icon: 'info', title: 'تمت الإعادة', text: 'رجعنا لصلاحيات الدور الافتراضية', timer: 1200, showConfirmButton: false });
        }

        // Simple pagination renderer
        function renderPagination(totalPages, current, onClickExprBuilder) {
            if (totalPages <= 1) return '';

            let html = '<nav><ul class="pagination justify-content-center">';
            const prev = Math.max(1, current - 1);
            const next = Math.min(totalPages, current + 1);

            html += `
                <li class="page-item ${current === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="${onClickExprBuilder(prev)};return false;">السابق</a>
                </li>
            `;

            // windowed pages
            const windowSize = 5;
            const start = Math.max(1, current - Math.floor(windowSize / 2));
            const end = Math.min(totalPages, start + windowSize - 1);
            for (let i = start; i <= end; i++) {
                html += `
                    <li class="page-item ${i === current ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="${onClickExprBuilder(i)};return false;">${i}</a>
                    </li>
                `;
            }

            html += `
                <li class="page-item ${current === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="${onClickExprBuilder(next)};return false;">التالي</a>
                </li>
            `;
            html += '</ul></nav>';
            return html;
        }

        function escapeHtml(str) {
            return String(str || '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        /* -------------------------------------------------------------------------- */
        /*                         Digits: Force English 0-9                          */
        /* -------------------------------------------------------------------------- */

        // Converts Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Eastern Arabic (۰۱۲۳۴۵۶۷۸۹) digits to English (0-9)
        function toEnglishDigits(input) {
            if (input === null || input === undefined) return input;
            return String(input)
                .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
                .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
        }

        function normalizeDigitsInNode(root) {
            if (!root) return;

            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode(node) {
                        // Ignore scripts/styles
                        const p = node.parentNode;
                        if (!p) return NodeFilter.FILTER_REJECT;
                        const tag = (p.nodeName || '').toLowerCase();
                        if (tag === 'script' || tag === 'style' || tag === 'noscript') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        // Skip empty text nodes
                        if (!node.nodeValue || !(/[\u0660-\u0669\u06F0-\u06F9]/.test(node.nodeValue))) {
                            return NodeFilter.FILTER_SKIP;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                },
                false
            );

            let textNode;
            while ((textNode = walker.nextNode())) {
                const fixed = toEnglishDigits(textNode.nodeValue);
                if (fixed !== textNode.nodeValue) textNode.nodeValue = fixed;
            }
        }

        function normalizeDigitsInInputs(root) {
            const scope = root || document;
            const inputs = scope.querySelectorAll('input, textarea');
            inputs.forEach(el => {
                // Convert on input for any field that can contain numbers
                if (!el.__englishDigitsBound) {
                    el.addEventListener('input', () => {
                        const fixed = toEnglishDigits(el.value);
                        if (fixed !== el.value) {
                            const pos = el.selectionStart;
                            el.value = fixed;
                            try { el.setSelectionRange(pos, pos); } catch (_) {}
                        }
                    });
                    el.__englishDigitsBound = true;
                }
                // Also normalize existing value
                const fixed = toEnglishDigits(el.value);
                if (fixed !== el.value) el.value = fixed;
            });
        }

        function initEnglishDigits() {
            // One-time pass
            normalizeDigitsInNode(document.body);
            normalizeDigitsInInputs(document);

            // Keep normalizing when the UI updates dynamically
            const obs = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.type === 'characterData') {
                        const node = m.target;
                        if (node && node.nodeValue && /[\u0660-\u0669\u06F0-\u06F9]/.test(node.nodeValue)) {
                            const fixed = toEnglishDigits(node.nodeValue);
                            if (fixed !== node.nodeValue) node.nodeValue = fixed;
                        }
                    }
                    if (m.addedNodes && m.addedNodes.length) {
                        m.addedNodes.forEach(n => {
                            if (n.nodeType === Node.TEXT_NODE) {
                                if (/[\u0660-\u0669\u06F0-\u06F9]/.test(n.nodeValue || '')) {
                                    n.nodeValue = toEnglishDigits(n.nodeValue);
                                }
                            } else if (n.nodeType === Node.ELEMENT_NODE) {
                                normalizeDigitsInNode(n);
                                normalizeDigitsInInputs(n);
                            }
                        });
                    }
                }
            });
            obs.observe(document.body, { subtree: true, childList: true, characterData: true });
        }

// Navbar UX: close the mobile menu after selecting a page (works for dropdown items too)
(function(){
  document.addEventListener('click', function(e){
    const a = e.target && e.target.closest ? e.target.closest('a[onclick*="showPage("]') : null;
    if(!a) return;

    const nav = document.getElementById('navbarNav');
    if(!nav) return;

    // If navbar is expanded on mobile, collapse it after click
    if(nav.classList.contains('show') && window.bootstrap && bootstrap.Collapse){
      try{
        const bs = bootstrap.Collapse.getInstance(nav) || new bootstrap.Collapse(nav, {toggle:false});
        bs.hide();
      }catch(_){/* no-op */}
    }
  }, true);
})();

/* -------------------------------------------------------------------------- */
/*                                   AI Chat                                  */
/* -------------------------------------------------------------------------- */
let aiChatHistory = [];

function loadAiChatHistory(){
    try{ aiChatHistory = JSON.parse(localStorage.getItem('smartEraAiChat') || '[]') || []; }catch(e){ aiChatHistory = []; }
}
function saveAiChatHistory(){
    try{ localStorage.setItem('smartEraAiChat', JSON.stringify(aiChatHistory)); }catch(_){}
}

function renderAiChat(){
    const box = document.getElementById('aiChatMessages');
    if (!box) return;
    box.innerHTML = aiChatHistory.map(m=>{
        const cls = m.role === 'user' ? 'user' : 'assistant';
        return `<div class="ai-chat-bubble ${cls}">${escapeHtml(m.content||'').replace(/\n/g,'<br>')}</div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

function openAiChat(){
    // Ensure page exists and permissioned
    try{ showPage('aiChat'); }catch(_){}
    loadAiChatHistory();
    renderAiChat();
    setTimeout(()=>{
        const inp = document.getElementById('aiChatInput');
        if(inp) inp.focus();
    }, 150);
}

function clearAiChat(){
    aiChatHistory = [];
    saveAiChatHistory();
    renderAiChat();
}

async function sendAiChatMessage(){
    const inp = document.getElementById('aiChatInput');
    if(!inp) return;
    const text = (inp.value||'').trim();
    if(!text) return;

    aiChatHistory.push({role:'user', content:text, ts:Date.now()});
    inp.value='';
    renderAiChat();

    // Try optional API endpoint (if admin configured it)
    let endpoint = '';
    try{ endpoint = localStorage.getItem('smartEraAiEndpoint') || '/api/ai/chat'; }catch(_){ endpoint = '/api/ai/chat'; }

    try{
        let reply = '';
        if(endpoint){
            const res = await fetch(endpoint, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({message:text, history: aiChatHistory.slice(-12)})
            });
            if(res.ok){
                const data = await res.json();
                reply = data.reply || data.message || '';
            }
        }

        if(!reply){
            reply = localAiAssistant(text);
        }

        aiChatHistory.push({role:'assistant', content:reply, ts:Date.now()});
        saveAiChatHistory();
        renderAiChat();
    }catch(err){
        aiChatHistory.push({role:'assistant', content:'صار خطأ أثناء تشغيل المساعد. إذا تريد ربط API تأكد من Endpoint صحيح.\n(تم الرجوع للوضع التجريبي)', ts:Date.now()});
        saveAiChatHistory();
        renderAiChat();
        console.warn('AI chat error', err);
    }
}

function localAiAssistant(input){
    const t = (input||'').toLowerCase();

    // Simple helpful routing
    if(t.includes('خصم') || t.includes('discount')){
        return 'إذا تريد تضيف خصم: ادخل على (الخصومات) ثم اضغط (إضافة خصم جديد). إذا ما يطلع الزر، راجع صلاحياتك (إدارة الصلاحيات > صلاحيات المستخدمين) وخلي (إضافة) مفعلة بصفحة الخصومات.';
    }
    if(t.includes('عقد') || t.includes('contract')){
        return 'بالنسبة للعقود: من (العقود) تقدر تضيف/تعدل/تحذف حسب الصلاحية. الموظف يقدر يشوف (عقدي) فقط.';
    }
    if(t.includes('مركبة') || t.includes('vehicle')){
        return 'صفحة المركبات تدعم إضافة/تعديل/حذف حسب الصلاحيات. إذا تحب أخلي زر معين يختفي عن موظف، نطفي صلاحية (إضافة/تعديل/حذف) له بهذي الصفحة.';
    }
    if(t.includes('وضع') && (t.includes('ليلي') || t.includes('dark'))){
        return 'الوضع الليلي يتفعل من أيقونة القمر/الشمس فوق. إذا واجهت كتابة غير واضحة، عادة المشكلة من ستايل يفرض لون ثابت — وقد تم إصلاحها حتى يصير النص واضح بكل الصفحات.';
    }

    return 'أنا هنا أساعدك داخل النظام. اكتب سؤالك مثل: (شلون أضيف خصم؟) أو (شلون أغير صلاحيات موظف؟) أو (وين ألقى عقدي؟).\n\nملاحظة: هذا مساعد تجريبي داخل الواجهة، وإذا تحب ربطه بـ AI حقيقي ممكن نضيف Endpoint من الإعدادات.';
}

// Initialize chat history once
try{ loadAiChatHistory(); }catch(_){}

/* =========================
   Global notifications & error handling
========================= */
function appNotify(type, title, message, timeoutMs=4500){
    const root = document.getElementById('appAlerts');
    if(!root) return;
    const el = document.createElement('div');
    el.className = `app-alert app-alert--${type||'info'}`;
    el.innerHTML = `
      <div class="content">
        <p class="title">${escapeHtml(title||'تنبيه')}</p>
        <p class="msg">${escapeHtml(message||'')}</p>
      </div>
      <button class="close" aria-label="إغلاق">×</button>
    `;
    const btn = el.querySelector('.close');
    if(btn) btn.addEventListener('click', ()=> el.remove());
    root.appendChild(el);
    if(timeoutMs){
        setTimeout(()=>{ try{ el.remove(); }catch(_){ } }, timeoutMs);
    }
}

window.addEventListener('error', (event)=>{
    try{
        const msg = event?.message || 'خطأ غير معروف';
        appNotify('error', 'حدث خطأ', msg, 6500);
    }catch(_){}
});
window.addEventListener('unhandledrejection', (event)=>{
    try{
        const msg = (event?.reason && (event.reason.message || String(event.reason))) || 'فشل تنفيذ العملية';
        appNotify('error', 'حدث خطأ', msg, 6500);
    }catch(_){}
});


/* =========================
   Dashboard (Admin)
========================= */
function loadDashboard(){
    try{
        const totalUsersEl = document.getElementById('totalUsers');
        const totalEmployeesEl = document.getElementById('totalEmployees');
        const activeContractsEl = document.getElementById('activeContractsCount');
        const totalVehiclesEl = document.getElementById('totalVehicles');
        const recentUpdatesEl = document.getElementById('recentUpdates');

        const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

        if(totalUsersEl) totalUsersEl.textContent = nf.format((users||[]).length);
        if(totalEmployeesEl) totalEmployeesEl.textContent = nf.format((employees||[]).length);

        const activeContracts = (contracts||[]).filter(c => (String(c.status||'').toLowerCase() !== 'منتهي' && String(c.status||'').toLowerCase() !== 'expired'));
        if(activeContractsEl) activeContractsEl.textContent = nf.format(activeContracts.length);

        if(totalVehiclesEl) totalVehiclesEl.textContent = nf.format((vehicles||[]).length);

        // recent updates: show last edits across entities
        if(recentUpdatesEl){
            const updates = [];
            (employees||[]).forEach(e => updates.push({t:'موظف', n:e.name||e.fullName||'', d:e.updatedAt||e.createdAt||''}));
            (discounts||[]).forEach(d => updates.push({t:'خصم', n:d.type||'', d:d.updatedAt||d.date||''}));
            (contracts||[]).forEach(c => updates.push({t:'عقد', n:c.employeeName||c.employeeId||'', d:c.updatedAt||c.startDate||''}));
            (vehicles||[]).forEach(v => updates.push({t:'مركبة', n:v.plate||v.model||'', d:v.updatedAt||v.createdAt||''}));

            updates.sort((a,b)=> new Date(b.d||0)-new Date(a.d||0));
            const top = updates.slice(0,6);

            if(!top.length){
                recentUpdatesEl.innerHTML = '<div class="text-muted">لا توجد تحديثات بعد.</div>';
            }else{
                recentUpdatesEl.innerHTML = top.map(u => `
                  <div class="recent-item">
                    <div class="recent-title">${escapeHtml(u.t)}: ${escapeHtml(u.n)}</div>
                    <div class="recent-date">${escapeHtml(formatDate(u.d))}</div>
                  </div>
                `).join('');
            }
        }
    }catch(err){
        console.warn('loadDashboard error', err);
        appNotify('error','Dashboard','صار خطأ أثناء تحميل الداشبورد');
    }
}


/* =========================
   Internal messaging (local demo)
   NOTE: if you connect a backend later, you can replace storage calls with API calls.
========================= */
let messagesStore = [];
let currentThreadUser = null;

function loadMessages(){
    try{
        messagesStore = JSON.parse(localStorage.getItem('smartEraMessages')||'[]');
    }catch(_){ messagesStore = []; }

    renderMessageThreads();
    renderMessageView();
    updateNavMessageBadge();
    updateNavNotifBadge();
    renderNotifDropdown();
    maybeNotifyNewMessage();

    // WhatsApp-like header (current user)
    try{
        const me = getCurrentUsername();
        const meName = document.getElementById('waMeName');
        const meAv = document.getElementById('waMeAvatar');
        if(meName) meName.textContent = getDisplayName(me);
        if(meAv) applyAvatarToEl(meAv, me);
    }catch(_){ }
}

function saveMessages(){
    try{ localStorage.setItem('smartEraMessages', JSON.stringify(messagesStore)); }catch(_){}
}

function getCurrentUsername(){
    try{
        const u = getCurrentUser?.();
        return (u && (u.username || u.email || u.name)) ? String(u.username || u.email || u.name) : 'unknown';
    }catch(_){
        return 'unknown';
    }
}

function getAllUsernames(){
    const list = (users||[]).map(u=>String(u.username||u.email||u.name||'').trim()).filter(Boolean);
    // unique
    return Array.from(new Set(list));
}

function getUserByUsername(username){
    const key = String(username||'').trim();
    if(!key) return null;
    return (users||[]).find(u => String(u.username||u.email||u.name||'').trim() === key) || null;
}

function getDisplayName(username){
    const u = getUserByUsername(username);
    return (u && (u.name||u.fullName||u.username||u.email)) ? String(u.name||u.fullName||u.username||u.email) : String(username||'');
}

function getInitialsFromName(nameOrEmail){
    const s = String(nameOrEmail||'U').trim();
    const parts = s.split(' ').filter(Boolean);
    const initials = parts.slice(0,2).map(p=>p[0]).join('').toUpperCase();
    return initials || 'U';
}

function applyAvatarToEl(el, username){
    if(!el) return;
    const u = getUserByUsername(username);
    const display = getDisplayName(username);
    const initials = getInitialsFromName(display);
    if(u && u.avatar){
        el.textContent = '';
        el.style.backgroundImage = `url(${u.avatar})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.style.backgroundColor = 'transparent';
    }else{
        el.textContent = initials;
        el.style.backgroundImage = '';
        // stable gradient by pseudo-id
        const pseudoId = (u && u.id) ? Number(u.id) : (Array.from(String(username||''))
            .reduce((a,c)=>a + c.charCodeAt(0), 0));
        el.style.background = getGradientForUser(pseudoId);
    }
}

function getTotalUnreadForMe(){
    const me = getCurrentUsername();
    return (messagesStore||[]).filter(m => m.to===me && !m.read).length;
}

function updateNavMessageBadge(){
    const badge = document.getElementById('navMsgBadge');
    if(!badge) return;
    const n = getTotalUnreadForMe();
    badge.textContent = String(n);
    badge.style.display = n>0 ? 'flex' : 'none';
}

/* =========================
   Notifications (per-user, local demo)
========================= */
function _notifKeyForUser(u){ return `smartEraNotifications_${u||'unknown'}`; }

function loadNotificationsForMe(){
    const me = getCurrentUsername();
    try{
        return JSON.parse(localStorage.getItem(_notifKeyForUser(me))||'[]');
    }catch(_){ return []; }
}

function saveNotificationsForMe(list){
    const me = getCurrentUsername();
    try{ localStorage.setItem(_notifKeyForUser(me), JSON.stringify(list||[])); }catch(_){ }
}

function addNotification(type, title, body){
    const list = loadNotificationsForMe();
    const item = { id: Date.now()+Math.floor(Math.random()*1000), type: type||'info', title: title||'', body: body||'', ts: Date.now(), read: false };
    list.unshift(item);
    // keep last 50
    saveNotificationsForMe(list.slice(0,50));
    updateNavNotifBadge();
    renderNotifDropdown();
}

function getUnreadNotifCount(){
    return loadNotificationsForMe().filter(n=>!n.read).length;
}

function updateNavNotifBadge(){
    const badge = document.getElementById('navNotifBadge');
    if(!badge) return;
    const n = getUnreadNotifCount();
    badge.textContent = String(n);
    badge.style.display = n>0 ? 'flex' : 'none';
}

function markAllNotificationsRead(){
    const list = loadNotificationsForMe().map(n=>({ ...n, read:true }));
    saveNotificationsForMe(list);
    updateNavNotifBadge();
    renderNotifDropdown();
}

function renderNotifDropdown(){
    const panel = document.getElementById('notifPanel');
    if(!panel) return;
    const list = loadNotificationsForMe();
    if(!list.length){
        panel.innerHTML = `<div class="notif-empty">لا توجد إشعارات</div>`;
        return;
    }
    panel.innerHTML = `
      <div class="notif-head">
        <div class="fw-bold">الإشعارات</div>
        <button class="btn btn-sm btn-outline-light" onclick="markAllNotificationsRead()">تحديد الكل كمقروء</button>
      </div>
      <div class="notif-list">
        ${list.slice(0,12).map(n=>`
          <div class="notif-item ${n.read?'read':''}" onclick="openNotification(${n.id})">
            <div class="notif-dot"></div>
            <div class="notif-body">
              <div class="notif-title">${escapeHtml(n.title||'')}</div>
              <div class="notif-text">${escapeHtml(n.body||'')}</div>
              <div class="notif-time">${escapeHtml(formatDate(n.ts))}</div>
            </div>
          </div>`).join('')}
      </div>`;
}

function openNotification(id){
    const list = loadNotificationsForMe();
    const n = list.find(x=>String(x.id)===String(id));
    if(n){ n.read=true; saveNotificationsForMe(list); }
    updateNavNotifBadge();
    renderNotifDropdown();
}

function maybeNotifyNewMessage(){
    try{
        const me = getCurrentUsername();
        if(!me) return;
        const key = `smartEraLastMsgNotifyTs_${me}`;
        const lastNotified = Number(localStorage.getItem(key) || '0');
        const unread = (messagesStore||[])
          .filter(m => m.to===me && !m.read)
          .sort((a,b)=>(b.ts||0)-(a.ts||0));
        if(!unread.length) return;
        const latest = unread[0];
        if((latest.ts||0) <= lastNotified) return;
        localStorage.setItem(key, String(latest.ts||Date.now()));
        appNotify('info', 'رسالة جديدة', `رسالة من: ${getDisplayName(latest.from)}`, 4800);
        addNotification('info', 'رسالة جديدة', `رسالة من: ${getDisplayName(latest.from)}`);
    }catch(_){ }
}

function renderMessageThreads(){
    const listEl = document.getElementById('messagesThreadList');
    const me = getCurrentUsername();
    if(!listEl) return;

    const q = (document.getElementById('msgSearch')?.value || '').trim().toLowerCase();

    // Build threads: other -> { last, unreadCount }
    const threads = new Map();
    (messagesStore||[])
      .filter(m => m.from===me || m.to===me)
      .forEach(m=>{
        const other = m.from===me ? m.to : m.from;
        if(q && !getDisplayName(other).toLowerCase().includes(q) && !String(other).toLowerCase().includes(q)) return;
        const t = threads.get(other) || { other, last: null, unread: 0 };
        if(!t.last || (m.ts||0) > (t.last.ts||0)) t.last = m;
        if(m.to===me && !m.read) t.unread += 1;
        threads.set(other, t);
      });

    const items = Array.from(threads.values())
      .filter(t => t.last)
      .sort((a,b)=>(b.last.ts||0)-(a.last.ts||0));

    if(!items.length){
        listEl.innerHTML = '<div class="text-muted p-3">لا توجد مراسلات بعد.</div>';
        return;
    }

    listEl.innerHTML = items.map(t=>{
        const other = t.other;
        const last = t.last;
        const time = last?.ts ? formatDate(last.ts) : '';
        const snippet = (last?.body||'').trim();
        const unread = t.unread>0 ? `<span class="thread-unread">${t.unread}</span>` : '';
        return `
          <button class="thread-item ${currentThreadUser===other?'active':''}" onclick="openThread('${escapeHtml(other)}')">
            <div class="thread-avatar" data-u="${escapeHtml(other)}"></div>
            <div class="thread-body">
              <div class="thread-top">
                <div class="thread-title">${escapeHtml(getDisplayName(other))}</div>
                <div class="thread-time">${escapeHtml(time)}</div>
              </div>
              <div class="thread-snippet">${escapeHtml(snippet.slice(0,60))}</div>
            </div>
            ${unread}
          </button>
        `;
    }).join('');

    // apply avatars
    listEl.querySelectorAll('.thread-avatar').forEach(el=>{
        const u = el.getAttribute('data-u') || '';
        applyAvatarToEl(el, u);
    });
}

function openThread(other){
    currentThreadUser = other;
    // mark read
    const me = getCurrentUsername();
    messagesStore.forEach(m=>{
        if(m.from===other && m.to===me) m.read = true;
    });
    saveMessages();
    renderMessageThreads();
    renderMessageView();
    updateNavMessageBadge();
}

function renderMessageView(){
    const viewEl = document.getElementById('messagesThreadView');
    const toSel = document.getElementById('msgToSelect');
    const me = getCurrentUsername();

    if(toSel){
        const options = getAllUsernames().filter(u=>u!==me);
        toSel.innerHTML = '<option value="">اختر موظف/مستخدم</option>' + options.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(getDisplayName(u))}</option>`).join('');
        if(currentThreadUser) toSel.value = currentThreadUser;
    }

    // Header
    const peerNameEl = document.getElementById('chatPeerName');
    const peerSubEl = document.getElementById('chatPeerSub');
    const peerAvatarEl = document.getElementById('chatPeerAvatar');
    if(peerNameEl) peerNameEl.textContent = currentThreadUser ? getDisplayName(currentThreadUser) : 'اختر محادثة';
    if(peerSubEl) peerSubEl.textContent = currentThreadUser ? 'متصل الآن' : '—';
    if(peerAvatarEl) applyAvatarToEl(peerAvatarEl, currentThreadUser);

    if(!viewEl) return;
    if(!currentThreadUser){
        viewEl.innerHTML = '<div class="text-muted p-3">اختر محادثة من القائمة أو ابدأ محادثة جديدة.</div>';
        return;
    }

    const msgs = messagesStore
      .filter(m => (m.from===me && m.to===currentThreadUser) || (m.from===currentThreadUser && m.to===me))
      .sort((a,b)=>(a.ts||0)-(b.ts||0));

    viewEl.innerHTML = msgs.map(m=>{
        // User requirement: my messages LEFT, other messages RIGHT
        const who = m.from===me ? 'me' : 'other';
        const seen = (who==='me') ? (m.read ? '<span class="wa-seen">✓✓</span>' : '<span class="wa-seen">✓</span>') : '';
        return `
          <div class="wa-msg ${who}">
            <div class="wa-msg-inner">
              <div class="wa-avatar" data-u="${escapeHtml(m.from)}"></div>
              <div class="wa-bubble">
                <div class="wa-msgtext">${escapeHtml(m.body||'')}</div>
                <div class="wa-meta">
                  <span class="wa-time">${escapeHtml(formatDate(m.ts))}</span>
                  ${seen}
                </div>
              </div>
            </div>
          </div>
        `;
    }).join('');
    viewEl.querySelectorAll('.wa-avatar').forEach(el=>{
        const u = el.getAttribute('data-u') || '';
        applyAvatarToEl(el, u);
    });

    // Apply mini avatars for incoming messages (server mode)
    viewEl.querySelectorAll('.wa-mini-avatar').forEach(el=>{
        const uid = el.getAttribute('data-user');
        const u = wa_cachedUsers.get(uid);
        if(u && u.avatar){
            el.style.backgroundImage = `url('${u.avatar}')`;
            el.textContent = '';
        }else{
            el.style.backgroundImage = '';
            el.textContent = getInitialsFromName(wa_userName(u||{name:uid}));
        }
    });
    viewEl.scrollTop = viewEl.scrollHeight;
}

// Enter to send
function handleMsgEnter(e){
    if(!e) return;
    if(e.key === 'Enter'){
        e.preventDefault();
        sendInternalMessage();
    }
}

// UI-only helpers (placeholders)
function openEmojiPicker(){
    appNotify('info','إيموجي','ميزة الإيموجي جاهزة للواجهة ويمكن ربطها بمكتبة لاحقاً', 2500);
}
function attachFile(){
    appNotify('info','إرفاق','ميزة الإرفاق يمكن تفعيلها عند ربط المراسلة بسيرفر', 2500);
}
function focusChatSearch(){
    const s = document.getElementById('msgSearch');
    if(s){ s.focus(); }
}
function toggleChatMenu(){
    // minimal menu using notification
    appNotify('info','المحادثة','خيارات: محادثة جديدة / مسح المحادثة', 2500);
}

function sendInternalMessage(){
    const toSel = document.getElementById('msgToSelect');
    const bodyInp = document.getElementById('msgBody');
    const me = getCurrentUsername();
    const to = (toSel?.value||'').trim();
    const body = (bodyInp?.value||'').trim();

    if(!to){
        appNotify('error','المراسلات','اختر المستلم');
        return;
    }
    if(!body){
        appNotify('error','المراسلات','اكتب الرسالة');
        return;
    }

    messagesStore.push({
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        from: me,
        to,
        body,
        ts: Date.now(),
        read: false
    });
    saveMessages();

    currentThreadUser = to;
    if(bodyInp) bodyInp.value = '';
    renderMessageThreads();
    renderMessageView();
    updateNavMessageBadge();
    appNotify('success','تم الإرسال','تم إرسال الرسالة بنجاح', 2500);
}

function startNewThread(){
    currentThreadUser = null;
    renderMessageThreads();
    renderMessageView();
    const sel = document.getElementById('msgToSelect');
    if(sel){ sel.value=''; sel.focus(); }
}

function clearThread(){
    try{
        const me = getCurrentUsername();
        if(!currentThreadUser){ appNotify('info','المراسلات','اختر محادثة أولاً'); return; }
        const peer = currentThreadUser;
        const before = messagesStore.length;
        messagesStore = (messagesStore||[]).filter(m => !((m.from===me && m.to===peer) || (m.from===peer && m.to===me)));
        saveMessages();
        currentThreadUser = null;
        renderMessageThreads();
        renderMessageView();
        updateNavMessageBadge();
        const removed = before - messagesStore.length;
        appNotify('success','تم','تم مسح المحادثة', 2200);
    }catch(err){
        console.warn('clearThread error', err);
        appNotify('error','المراسلات','صار خطأ أثناء المسح');
    }
}

/* =========================
   SweetAlert fallback (so error messages always show)
========================= */
if(!window.Swal){
    window.Swal = {
        fire: ({icon,title,text}) => {
            const t = title || 'تنبيه';
            const m = text || '';
            const type = icon === 'error' ? 'error' : (icon === 'success' ? 'success' : 'info');
            appNotify(type, t, m, 6000);
        }
    };
}


/* =========================
   Profile
========================= */
function loadProfile(){
    try{
        const user = getCurrentUser?.();
        if(!user){
            appNotify('error','الملف الشخصي','يجب تسجيل الدخول أولاً');
            return;
        }

        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const roleBadge = document.getElementById('profileRoleBadge');
        const roleText = document.getElementById('profileRoleText');
        const avatar = document.getElementById('profileAvatar');

        const name = user.name || user.fullName || user.username || '';
        const email = user.email || '';
        const role = user.role || 'employee';

        if(nameEl) nameEl.textContent = name || '—';
        if(emailEl) emailEl.textContent = email || '—';
        if(roleBadge) roleBadge.textContent = role;
        if(roleText) roleText.textContent = role;

        if(avatar){
            const initials = (name||email||'U').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
            if(user.avatar){
                avatar.textContent = '';
                avatar.style.background = 'transparent';
                avatar.style.backgroundImage = `url(${user.avatar})`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
            }else{
                avatar.textContent = initials;
                avatar.style.backgroundImage = '';
                avatar.style.background = getGradientForUser(user.id);
            }
        }

        // Avatar upload (shared across profile + navbar + messaging)
        const fileInput = document.getElementById('profileAvatarFile');
        if(fileInput && !fileInput.__bound){
            fileInput.__bound = true;
            fileInput.addEventListener('change', async (e)=>{
                try{
                    const file = e.target.files && e.target.files[0];
                    if(!file) return;
                    // Basic size guard (keeps localStorage stable)
                    if(file.size > 900 * 1024){
                        appNotify('error','الصورة كبيرة','رجاءً اختر صورة أصغر من 900KB');
                        e.target.value='';
                        return;
                    }
                    const dataUrl = await readFileAsDataUrl(file);
                    const updated = { ...user, avatar: dataUrl, updatedAt: new Date().toISOString() };
                    const idx = (users||[]).findIndex(u => String(u.id)===String(user.id));
                    if(idx>=0) users[idx] = updated;
                    try{ localStorage.setItem('users', JSON.stringify(users)); }catch(_){ }
                    try{ localStorage.setItem('currentUser', JSON.stringify(updated)); }catch(_){ }
                    // refresh
                    currentUser = updated;
                    updateUIForUser();
                    loadProfile();
                    appNotify('success','تم','تم تحديث صورة الملف الشخصي', 2300);
                }catch(err){
                    console.warn('avatar upload error', err);
                    appNotify('error','الصورة','صار خطأ أثناء رفع الصورة');
                }
            });
        }

        // Fill form
        const nameInp = document.getElementById('profileNameInput');
        const emailInp = document.getElementById('profileEmailInput');
        const phoneInp = document.getElementById('profilePhoneInput');
        const notesInp = document.getElementById('profileNotesInput');

        if(nameInp) nameInp.value = name;
        if(emailInp) emailInp.value = email;
        if(phoneInp) phoneInp.value = user.phone || '';
        if(notesInp) notesInp.value = user.notes || '';

        const form = document.getElementById('profileForm');
        if(form && !form.__bound){
            form.__bound = true;
            form.addEventListener('submit', (e)=>{
                e.preventDefault();
                const updated = {
                    ...user,
                    name: (nameInp?.value||'').trim(),
                    email: (emailInp?.value||'').trim(),
                    phone: (phoneInp?.value||'').trim(),
                    notes: (notesInp?.value||'').trim(),
                    updatedAt: new Date().toISOString()
                };
                // update in users array if exists
                const idx = (users||[]).findIndex(u => String(u.id)===String(user.id));
                if(idx>=0) users[idx]=updated;

                try{ localStorage.setItem('users', JSON.stringify(users)); }catch(_){}
                try{ localStorage.setItem('currentUser', JSON.stringify(updated)); }catch(_){}

                appNotify('success','تم الحفظ','تم تحديث بيانات الملف الشخصي', 2600);
                // refresh header
                loadProfile();
                try{ updateUserUI?.(); }catch(_){}
            });
        }

        const pwForm = document.getElementById('passwordForm');
        if(pwForm && !pwForm.__bound){
            pwForm.__bound=true;
            pwForm.addEventListener('submit', (e)=>{
                e.preventDefault();
                const cur = document.getElementById('profileCurrentPassword')?.value || '';
                const n1  = document.getElementById('profileNewPassword')?.value || '';
                const n2  = document.getElementById('profileConfirmPassword')?.value || '';

                if((user.password||'') && cur !== (user.password||'')){
                    appNotify('error','الأمان','كلمة المرور الحالية غير صحيحة');
                    return;
                }
                if(n1.length < 6){
                    appNotify('error','الأمان','كلمة المرور الجديدة لازم تكون 6 أحرف على الأقل');
                    return;
                }
                if(n1 !== n2){
                    appNotify('error','الأمان','تأكيد كلمة المرور غير مطابق');
                    return;
                }

                const updated = { ...user, password: n1, updatedAt: new Date().toISOString() };
                const idx = (users||[]).findIndex(u => String(u.id)===String(user.id));
                if(idx>=0) users[idx]=updated;

                try{ localStorage.setItem('users', JSON.stringify(users)); }catch(_){}
                try{ localStorage.setItem('currentUser', JSON.stringify(updated)); }catch(_){}

                // clear
                ['profileCurrentPassword','profileNewPassword','profileConfirmPassword'].forEach(id=>{
                    const el=document.getElementById(id); if(el) el.value='';
                });
                appNotify('success','الأمان','تم تغيير كلمة المرور', 2600);
            });
        }

    }catch(err){
        console.warn('loadProfile error', err);
        appNotify('error','الملف الشخصي','صار خطأ أثناء تحميل الملف الشخصي');
    }
}


/* ========================================================================== */
/*                     WhatsApp-like LIVE Messaging (Server)                   */
/*  - Only shows chats for current account                                     */
/*  - Left: my messages, Right: other user                                     */
/*  - Notifications icon + badge updates                                       */
/*  - Settings (WhatsApp-like) for chat/notifications/privacy                  */
/* ========================================================================== */

let wa_activeChatId = null;
let wa_activePeerId = null;
let wa_cachedUsers = new Map();
let wa_chatsCache = [];
let wa_messagesCache = [];

function wa_hasServer() {
    try {
        loadApiConfig();
        return !!apiToken && !!API_BASE && typeof fetch === 'function';
    } catch (_) {
        return false;
    }
}

async function wa_bootstrapUsers() {
    if (!wa_hasServer()) return;
    const data = await apiFetch('/api/users');
    wa_cachedUsers = new Map((data.users || []).map(u => [u.id, u]));
}

function wa_meId() {
    try {
        // Prefer server user id if present
        if (currentUser && currentUser.serverId) return currentUser.serverId;
        if (currentUser && typeof currentUser.id !== 'undefined') {
            // Local demo ids are numeric. Server uses strings. We'll map by email at runtime.
        }
        return null;
    } catch (_) { return null; }
}

function wa_syncCurrentUserFromServer(user) {
    if (!user) return;
    try {
        currentUser = currentUser || {};
        currentUser.serverId = user.id;
        currentUser.name = user.name || currentUser.name;
        currentUser.email = user.email || currentUser.email;
        currentUser.role = user.role || currentUser.role;
        currentUser.avatar = user.avatar || currentUser.avatar || null;
        currentUser.status = user.status || currentUser.status || 'متاح';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (_) {}
}

async function wa_initRealtime() {
    if (!wa_hasServer()) return;
    // Ensure token is valid + get me
    try {
        const me = await apiFetch('/api/me');
        wa_syncCurrentUserFromServer(me);
    } catch (_) {}

    await wa_bootstrapUsers();

    const s = connectSocket();
    if (s) {
        s.off('message');
        s.on('message', (msg) => {
            // Update caches + UI
            try {
                if (wa_activeChatId && msg.chatId === wa_activeChatId) {
                    wa_messagesCache.push(msg);
                    renderMessageView();
                    // Auto-mark read when open
                    wa_markChatRead(wa_activeChatId).catch(()=>{});
                }
                // Refresh list + badges
                renderMessageThreads();
                updateNavMessageBadge();
            } catch (_) {}
        });

        s.off('notification');
        s.on('notification', (n) => {
            try {
                // top banner
                appNotify('info', n.title || 'إشعار', n.body || '', 3500);
                updateNavNotifBadge();
                renderNotifDropdown();
            } catch (_) {}
        });

        s.off('profile_updated');
        s.on('profile_updated', (u) => {
            try {
                wa_cachedUsers.set(u.id, { ...(wa_cachedUsers.get(u.id)||{}), ...u });
                if (currentUser && currentUser.serverId === u.id) {
                    currentUser.avatar = u.avatar || currentUser.avatar;
                    currentUser.name = u.name || currentUser.name;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateUserDisplay();
                }
                if (wa_activePeerId === u.id) {
                    renderMessageView();
                    renderMessageThreads();
                }
            } catch (_) {}
        });
    }
}

async function wa_loadChats() {
    if (!wa_hasServer()) return [];
    const data = await apiFetch('/api/chats');
    wa_chatsCache = data.chats || [];
    return wa_chatsCache;
}

async function wa_loadMessages(chatId) {
    if (!wa_hasServer()) return [];
    const data = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`);
    wa_messagesCache = data.messages || [];
    return wa_messagesCache;
}

async function wa_markChatRead(chatId) {
    if (!wa_hasServer()) return;
    await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: 'POST', body: '{}' });
}

function wa_userAvatar(user) {
    if (user && user.avatar) return user.avatar;
    return null;
}

function wa_userName(user) {
    return (user && (user.name || user.email)) ? String(user.name || user.email) : 'مستخدم';
}

/* ----------------------- Override existing functions ---------------------- */

async function loadMessages(){
    // If server is available => live mode
    if (wa_hasServer()) {
        await wa_initRealtime();
        await renderMessageThreads();
        await updateNavMessageBadge();
        await updateNavNotifBadge();
        await renderNotifDropdown();
        return;
    }
    // fallback to local demo (existing implementation)
    try{ messagesStore = JSON.parse(localStorage.getItem('smartEraMessages')||'[]'); }catch(_){ messagesStore = []; }
    renderMessageThreads();
    renderMessageView();
    updateNavMessageBadge();
    updateNavNotifBadge();
    renderNotifDropdown();
    maybeNotifyNewMessage();
}

async function renderMessageThreads(){
    const listEl = document.getElementById('messagesThreadList');
    if(!listEl) return;
    const search = String((document.getElementById('msgSearch')?.value)||'').trim();

    if (!wa_hasServer()) {
        // local demo
        listEl.innerHTML = '';
        const me = getCurrentUsername();
        const peers = new Map();
        (messagesStore||[]).forEach(m=>{
            if(m.from===me) peers.set(m.to, true);
            if(m.to===me) peers.set(m.from, true);
        });
        const arr = Array.from(peers.keys())
            .filter(u => !search || getDisplayName(u).includes(search))
            .map(u => ({ username:u }));
        if(!arr.length){
            listEl.innerHTML = '<div class="text-muted p-3">لا توجد محادثات بعد</div>';
            return;
        }
        listEl.innerHTML = arr.map(it => {
            const active = (currentThreadUser===it.username) ? 'active' : '';
            const unread = (messagesStore||[]).filter(m=>m.from===it.username && m.to===me && !m.read).length;
            return `
              <div class="thread-item ${active}" onclick="openThread('${encodeURIComponent(it.username)}')">
                <div class="avatar" data-u="${escapeHtml(it.username)}"></div>
                <div class="info">
                  <div class="name">${escapeHtml(getDisplayName(it.username))}</div>
                </div>
                ${unread?`<span class="badge bg-danger">${unread}</span>`:''}
              </div>
            `;
        }).join('');
        // apply avatars
        listEl.querySelectorAll('.avatar').forEach(a=> applyAvatarToEl(a, a.getAttribute('data-u')));
        return;
    }

    const chats = await wa_loadChats();
    const filtered = (chats||[]).filter(c => {
        const n = c.peer?.name || '';
        return !search || n.includes(search);
    });

    if(!filtered.length){
        listEl.innerHTML = '<div class="text-muted p-3">لا توجد محادثات بعد</div>';
        return;
    }

    listEl.innerHTML = filtered.map(c => {
        const active = (wa_activeChatId===c.id) ? 'active' : '';
        const unread = Number(c.unread||0);
        const last = c.lastMessage?.text ? escapeHtml(c.lastMessage.text) : '';
        const peerName = escapeHtml(c.peer?.name || 'مستخدم');
        return `
          <div class="thread-item ${active}" onclick="openThreadByChat('${c.id}')">
            <div class="avatar wa-avatar" data-peer="${escapeHtml(c.peer?.id||'')}"></div>
            <div class="info">
              <div class="name">${peerName}</div>
              <div class="preview text-muted">${last}</div>
            </div>
            ${unread?`<span class="badge bg-danger">${unread}</span>`:''}
          </div>
        `;
    }).join('');

    listEl.querySelectorAll('.wa-avatar').forEach(el=>{
        const pid = el.getAttribute('data-peer');
        const u = wa_cachedUsers.get(pid) || null;
        const name = wa_userName(u);
        const initials = getInitialsFromName(name);
        if (u && u.avatar) {
            el.textContent='';
            el.style.backgroundImage = `url(${u.avatar})`;
            el.style.backgroundSize='cover';
            el.style.backgroundPosition='center';
        } else {
            el.style.backgroundImage='';
            el.textContent = initials;
            el.style.background = getGradientForUser((pid||'').length*17);
        }
    });
}

async function openThreadByChat(chatId){
    wa_activeChatId = chatId;
    // find peer
    const c = (wa_chatsCache||[]).find(x => x.id===chatId);
    wa_activePeerId = c?.peer?.id || null;

    await wa_loadMessages(chatId);
    await wa_markChatRead(chatId).catch(()=>{});
    renderMessageView();
    renderMessageThreads();
    updateNavMessageBadge();
}

function openThread(encodedUsername){
    // local demo compatibility
    const username = decodeURIComponent(encodedUsername||'');
    currentThreadUser = username;
    renderMessageView();
    renderMessageThreads();
    updateNavMessageBadge();
}

function renderMessageView(){
    const viewEl = document.getElementById('messagesThreadView');
    if(!viewEl) return;

    // header elements
    const nameEl = document.getElementById('chatPeerName');
    const statusEl = document.getElementById('chatPeerStatus');
    const avEl = document.getElementById('chatPeerAvatar');

    if (!wa_hasServer()) {
        // local demo
        const me = getCurrentUsername();
        const peer = currentThreadUser;
        if(!peer){
            viewEl.innerHTML = '<div class="text-muted p-4">اختر محادثة أو ابدأ محادثة جديدة</div>';
            if(nameEl) nameEl.textContent = 'اختر محادثة';
            if(statusEl) statusEl.textContent = '';
            if(avEl) avEl.textContent = '';
            return;
        }
        if(nameEl) nameEl.textContent = getDisplayName(peer);
        if(statusEl) statusEl.textContent = 'متاح';
        if(avEl) applyAvatarToEl(avEl, peer);

        const msgs = (messagesStore||[])
            .filter(m => (m.from===me && m.to===peer) || (m.from===peer && m.to===me))
            .sort((a,b)=> (a.ts||0)-(b.ts||0));

        viewEl.innerHTML = msgs.map(m => {
            const mine = m.from===me;
            return `
              <div class="wa-bubble ${mine?'mine':'theirs'}">
                <div class="text">${escapeHtml(m.body||m.text||'')}</div>
                <div class="meta">${escapeHtml(formatTime(m.ts||Date.now()))}</div>
              </div>
            `;
        }).join('');
    
    // Apply mini avatars for incoming messages (server mode)
    viewEl.querySelectorAll('.wa-mini-avatar').forEach(el=>{
        const uid = el.getAttribute('data-user');
        const u = wa_cachedUsers.get(uid);
        if(u && u.avatar){
            el.style.backgroundImage = `url('${u.avatar}')`;
            el.textContent = '';
        }else{
            el.style.backgroundImage = '';
            el.textContent = getInitialsFromName(wa_userName(u||{name:uid}));
        }
    });
    viewEl.scrollTop = viewEl.scrollHeight;
        return;
    }

    // server live
    const peer = wa_cachedUsers.get(wa_activePeerId) || null;
    if(!wa_activeChatId || !peer){
        viewEl.innerHTML = '<div class="text-muted p-4">اختر محادثة أو ابدأ محادثة جديدة</div>';
        if(nameEl) nameEl.textContent = 'اختر محادثة';
        if(statusEl) statusEl.textContent = '';
        if(avEl) { avEl.textContent=''; avEl.style.backgroundImage=''; }
        return;
    }

    if(nameEl) nameEl.textContent = wa_userName(peer);
    if(statusEl) statusEl.textContent = peer.status || 'متاح';
    if(avEl){
        const av = wa_userAvatar(peer);
        if(av){
            avEl.textContent='';
            avEl.style.backgroundImage = `url(${av})`;
            avEl.style.backgroundSize='cover';
            avEl.style.backgroundPosition='center';
        }else{
            avEl.style.backgroundImage='';
            avEl.textContent = getInitialsFromName(wa_userName(peer));
        }
    }

    const meId = currentUser?.serverId;
    viewEl.innerHTML = (wa_messagesCache||[]).map(m => {
        const mine = m.from === meId;
        const isRead = !!m.readAt;
        // We treat saved messages as delivered. For a "sent only" state, we'd need delivery acks.
        const ticks = mine ? `<span class="wa-ticks ${isRead?'read':''}">✓✓</span>` : '';
        const avatar = !mine ? `<div class="wa-mini-avatar" data-user="${escapeHtml(m.from)}"></div>` : '';
        return `
          <div class="wa-row ${mine?'mine':'theirs'}">
            ${avatar}
            <div class="wa-bubble ${mine?'mine':'theirs'}">
              <div class="text">${escapeHtml(m.text||'')}</div>
              <div class="meta">
                <span class="time">${escapeHtml(formatTime(m.createdAt))}</span>
                ${ticks}
              </div>
            </div>
          </div>
        `;
    }).join('');

    // Apply mini avatars for incoming messages (server mode)
    viewEl.querySelectorAll('.wa-mini-avatar').forEach(el=>{
        const uid = el.getAttribute('data-user');
        const u = wa_cachedUsers.get(uid);
        if(u && u.avatar){
            el.style.backgroundImage = `url('${u.avatar}')`;
            el.textContent = '';
        }else{
            el.style.backgroundImage = '';
            el.textContent = getInitialsFromName(wa_userName(u||{name:uid}));
        }
    });
    viewEl.scrollTop = viewEl.scrollHeight;
}

async function startNewThread(){
    // server mode: open a picker
    if (wa_hasServer()) {
        await wa_bootstrapUsers();
        const me = currentUser?.serverId;
        const opts = [...wa_cachedUsers.values()].filter(u => u.id !== me);
        const select = document.getElementById('msgToSelect');
        if(select){
            select.innerHTML = opts.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name||u.email)}</option>`).join('');
        }
        if(opts.length){
            wa_activePeerId = opts[0].id;
            wa_activeChatId = null;
            renderMessageView();
        }
        appNotify('info','المراسلة','اختر موظف من القائمة وابدأ المراسلة', 2500);
        return;
    }
    // fallback local: keep existing behavior
    try{
        const list = getAllUsernames().filter(u => u!==getCurrentUsername());
        const sel = document.getElementById('msgToSelect');
        if(sel) sel.innerHTML = list.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(getDisplayName(u))}</option>`).join('');
        if(list.length){ currentThreadUser = list[0]; renderMessageView(); renderMessageThreads(); }
    }catch(_){ }
}

async function sendInternalMessage(){
    const input = document.getElementById('msgBody');
    const sel = document.getElementById('msgToSelect');
    const text = String(input?.value||'').trim();
    if(!text){ appNotify('warning','تنبيه','اكتب رسالة أولاً', 2200); return; }

    if (wa_hasServer()) {
        const toUserId = sel?.value || wa_activePeerId;
        if(!toUserId){ appNotify('warning','تنبيه','اختر موظف للمراسلة', 2200); return; }
        const resp = await apiFetch('/api/messages/send', { method:'POST', body: JSON.stringify({ toUserId, text }) });
        if(resp?.chatId){
            wa_activeChatId = resp.chatId;
            wa_activePeerId = toUserId;
            await wa_loadMessages(wa_activeChatId);
            await wa_markChatRead(wa_activeChatId).catch(()=>{});
        }
        if(input) input.value='';
        renderMessageView();
        renderMessageThreads();
        updateNavMessageBadge();
        return;
    }

    // local demo
    const me = getCurrentUsername();
    const peer = sel?.value || currentThreadUser;
    if(!peer){ appNotify('warning','تنبيه','اختر موظف للمراسلة', 2200); return; }
    messagesStore.push({ id: Date.now()+Math.random(), from: me, to: peer, body: text, ts: Date.now(), read: false });
    saveMessages();
    currentThreadUser = peer;
    if(input) input.value='';
    renderMessageView();
    renderMessageThreads();
    updateNavMessageBadge();
}

async function clearThread(){
    if (wa_hasServer()) {
        appNotify('info','ملاحظة','مسح المحادثة يتطلب Endpoint حذف (سأضيفه إذا تحتاج)', 3000);
        return;
    }
    // local demo
    const me = getCurrentUsername();
    const peer = currentThreadUser;
    if(!peer) return;
    messagesStore = (messagesStore||[]).filter(m => !((m.from===me && m.to===peer) || (m.from===peer && m.to===me)));
    saveMessages();
    renderMessageView();
    renderMessageThreads();
    updateNavMessageBadge();
}

/* ---------------- Notifications (server-backed if available) -------------- */

async function updateNavNotifBadge(){
    const badge = document.getElementById('navNotifBadge');
    if(!badge) return;
    if (wa_hasServer()) {
        try {
            const data = await apiFetch('/api/notifications');
            const unread = (data.notifications||[]).filter(n => !n.readAt).length;
            badge.textContent = String(unread);
            badge.style.display = unread>0 ? 'flex' : 'none';
            return;
        } catch(_){}
    }
    // fallback: keep old
    const me = getCurrentUsername();
    const list = loadNotificationsForMe();
    const unread = (list||[]).filter(n => !n.read).length;
    badge.textContent = String(unread);
    badge.style.display = unread>0 ? 'flex' : 'none';
}

async function renderNotifDropdown(){
    const el = document.getElementById('notifDropdownList');
    if(!el) return;
    if (wa_hasServer()) {
        try {
            const data = await apiFetch('/api/notifications');
            const list = data.notifications || [];
            if(!list.length){ el.innerHTML = '<div class="text-muted p-3">لا توجد إشعارات</div>'; return; }
            el.innerHTML = list.slice(0,10).map(n => `
              <div class="notif-item ${n.readAt?'':'unread'}">
                <div class="title">${escapeHtml(n.title||'')}</div>
                <div class="body">${escapeHtml(n.body||'')}</div>
                <div class="time">${escapeHtml(formatTime(n.createdAt))}</div>
              </div>
            `).join('');
            return;
        } catch(_){}
    }
    // fallback to local
    const list = loadNotificationsForMe();
    if(!list.length){ el.innerHTML = '<div class="text-muted p-3">لا توجد إشعارات</div>'; return; }
    el.innerHTML = (list||[]).slice(0,10).map(n => `
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="title">${escapeHtml(n.title||'')}</div>
        <div class="body">${escapeHtml(n.body||'')}</div>
        <div class="time">${escapeHtml(new Date(n.ts||Date.now()).toLocaleTimeString('ar-IQ-u-nu-latn'))}</div>
      </div>
    `).join('');
}

async function updateNavMessageBadge(){
    const badge = document.getElementById('navMsgBadge');
    if(!badge) return;
    if (wa_hasServer()) {
        try {
            const chats = await wa_loadChats();
            const unread = (chats||[]).reduce((a,c)=>a + Number(c.unread||0), 0);
            badge.textContent = String(unread);
            badge.style.display = unread>0 ? 'flex' : 'none';
            return;
        } catch(_){}
    }
    const n = getTotalUnreadForMe();
    badge.textContent = String(n);
    badge.style.display = n>0 ? 'flex' : 'none';
}

/* -------------------------- WhatsApp-like Settings ------------------------- */

let wa_settingsCache = null;

async function wa_loadSettings(){
    if (wa_hasServer()) {
        const data = await apiFetch('/api/settings');
        wa_settingsCache = data.settings || null;
        return wa_settingsCache;
    }
    try{ wa_settingsCache = JSON.parse(localStorage.getItem('waChatSettings')||'null'); }catch(_){ wa_settingsCache = null; }
    if(!wa_settingsCache){
        wa_settingsCache = { privacy_last_seen:'everyone', privacy_read_receipts:true, notifications_enabled:true, notifications_sound:true, chat_wallpaper:'wa1', chat_font_size:'md' };
    }
    return wa_settingsCache;
}

function wa_applySettingsToUI(settings){
    const view = document.getElementById('messagesThreadView');
    if(view && settings){
        view.setAttribute('data-wallpaper', settings.chat_wallpaper || 'wa1');
        view.setAttribute('data-font', settings.chat_font_size || 'md');
    }
}

async function openChatSettings(){
    try{
        const modalEl = document.getElementById('waChatSettingsModal');
        if(!modalEl) return;

        const settings = await wa_loadSettings();
        wa_applySettingsToUI(settings);

        // fill profile
        const name = currentUser?.name || '';
        const email = currentUser?.email || '';
        const avatar = currentUser?.avatar || null;
        const status = currentUser?.status || 'متاح';

        const nEl = document.getElementById('waSettingsName');
        const eEl = document.getElementById('waSettingsEmail');
        const aEl = document.getElementById('waSettingsAvatar');
        if(nEl) nEl.textContent = name || '—';
        if(eEl) eEl.textContent = email || '—';
        if(aEl){
            if(avatar){
                aEl.textContent='';
                aEl.style.backgroundImage = `url(${avatar})`;
                aEl.style.backgroundSize='cover';
                aEl.style.backgroundPosition='center';
            }else{
                aEl.style.backgroundImage='';
                aEl.textContent = getInitialsFromName(name||email||'U');
            }
        }
        const pn = document.getElementById('waProfileName');
        const ps = document.getElementById('waProfileStatus');
        if(pn) pn.value = name;
        if(ps) ps.value = status;

        // fill settings
        const w = document.getElementById('waChatWallpaper');
        const f = document.getElementById('waChatFontSize');
        const ne = document.getElementById('waNotifsEnabled');
        const ns = document.getElementById('waNotifsSound');
        const ls = document.getElementById('waPrivacyLastSeen');
        const rr = document.getElementById('waPrivacyReadReceipts');
        if(w) w.value = settings.chat_wallpaper || 'wa1';
        if(f) f.value = settings.chat_font_size || 'md';
        if(ne) ne.checked = settings.notifications_enabled !== false;
        if(ns) ns.checked = settings.notifications_sound !== false;
        if(ls) ls.value = settings.privacy_last_seen || 'everyone';
        if(rr) rr.checked = settings.privacy_read_receipts !== false;

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }catch(err){
        console.warn(err);
        appNotify('error','الإعدادات','تعذر فتح الإعدادات');
    }
}

async function saveChatSettings(){
    try{
        const w = document.getElementById('waChatWallpaper')?.value || 'wa1';
        const f = document.getElementById('waChatFontSize')?.value || 'md';
        const ne = !!document.getElementById('waNotifsEnabled')?.checked;
        const ns = !!document.getElementById('waNotifsSound')?.checked;
        const ls = document.getElementById('waPrivacyLastSeen')?.value || 'everyone';
        const rr = !!document.getElementById('waPrivacyReadReceipts')?.checked;
        const profileName = String(document.getElementById('waProfileName')?.value||'').trim();
        const profileStatus = String(document.getElementById('waProfileStatus')?.value||'').trim();

        // Avatar file => dataURL
        let avatarData = null;
        const file = document.getElementById('waProfileAvatar')?.files?.[0] || null;
        if(file){
            avatarData = await new Promise((resolve)=>{
                const r = new FileReader();
                r.onload = ()=> resolve(String(r.result||''));
                r.onerror = ()=> resolve(null);
                r.readAsDataURL(file);
            });
        }

        const payload = {
            chat_wallpaper: w,
            chat_font_size: f,
            notifications_enabled: ne,
            notifications_sound: ns,
            privacy_last_seen: ls,
            privacy_read_receipts: rr
        };

        if (wa_hasServer()) {
            await apiFetch('/api/settings', { method:'PUT', body: JSON.stringify(payload) });
            // profile update if any
            const prof = {};
            if(profileName) prof.name = profileName;
            prof.status = profileStatus || 'متاح';
            if(avatarData) prof.avatar = avatarData;
            await apiFetch('/api/profile', { method:'PUT', body: JSON.stringify(prof) });
            // refresh me
            const me = await apiFetch('/api/me');
            wa_syncCurrentUserFromServer(me);
        } else {
            wa_settingsCache = payload;
            try{ localStorage.setItem('waChatSettings', JSON.stringify(payload)); }catch(_){ }
            // local profile
            if(profileName){ currentUser.name = profileName; }
            currentUser.status = profileStatus || currentUser.status || 'متاح';
            if(avatarData) currentUser.avatar = avatarData;
            try{ localStorage.setItem('currentUser', JSON.stringify(currentUser)); }catch(_){ }
        }

        wa_applySettingsToUI(payload);
        renderMessageView();
        renderMessageThreads();
        updateUserDisplay();
        appNotify('success','الإعدادات','تم الحفظ بنجاح', 2400);
        const modalEl = document.getElementById('waChatSettingsModal');
        if(modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    }catch(err){
        console.warn(err);
        appNotify('error','الإعدادات', err?.message || 'فشل الحفظ');
    }
}

// Apply settings on page load (if messaging page is visited)
document.addEventListener('DOMContentLoaded', ()=>{
    wa_loadSettings().then(s=> wa_applySettingsToUI(s)).catch(()=>{});
});
