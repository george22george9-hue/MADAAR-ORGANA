// ====================================================================
// ORGANA Database Seeder — The Great Martyr St. George Church, Sandbees
// Developed by MADAAR Technologies
// ====================================================================

import db from './index';

export function seedDatabase() {
  const existingYear = db.prepare('SELECT id FROM academic_years LIMIT 1').get();
  if (existingYear) {
    // Already seeded
    return;
  }

  console.log('Seeding ORGANA database with St. George Church Sandbees initial records...');

  const transaction = db.transaction(() => {
    // 1. Academic Year
    const yearId = 'ay-2026-2027';
    db.prepare(`
      INSERT INTO academic_years (id, name, start_date, end_date, is_active, is_archived)
      VALUES (?, ?, ?, ?, 1, 0)
    `).run(yearId, '2026–2027', '2026-09-01', '2027-08-31');

    // 2. System Settings
    db.prepare(`
      INSERT OR REPLACE INTO system_settings (
        id, church_name_ar, church_name_en, consecutive_absence_threshold, 
        active_academic_year_id, servant_can_view_all_family_members, allow_servant_attendance_recording
      ) VALUES ('default', ?, ?, 3, ?, 0, 1)
    `).run(
      'كنيسة الشهيد العظيم مارجرجس بسندبيس',
      'The Great Martyr St. George Church – Sandbees, Egypt',
      yearId
    );

    // 3. The 10 Initial Families required by specifications
    const initialFamilies = [
      { id: 'fam-nursery', name: 'حضانة', type: 'children_class', color: '#832729', day: 'Friday', time: '16:00', loc: 'مبنى الخدمات - الدور الأرضي' },
      { id: 'fam-pri1-2', name: 'أولى وتانية', type: 'children_class', color: '#9C344A', day: 'Friday', time: '16:00', loc: 'مبنى الخدمات - الدور الأول' },
      { id: 'fam-pri3-4', name: 'تالتة ورابعة', type: 'children_class', color: '#702C3B', day: 'Friday', time: '16:30', loc: 'مبنى الخدمات - قاعة القديس أبانوب' },
      { id: 'fam-pri5-6', name: 'خامسة وسادسة', type: 'children_class', color: '#5B1E2D', day: 'Friday', time: '16:30', loc: 'مبنى الخدمات - قاعة الأنبا كاراس' },
      { id: 'fam-prep-boys', name: 'إعدادي بنين', type: 'children_class', color: '#421923', day: 'Friday', time: '17:00', loc: 'الكنيسة الرئيسية - قاعة الشهيد مارجرجس' },
      { id: 'fam-prep-girls', name: 'إعدادي بنات', type: 'children_class', color: '#A34358', day: 'Friday', time: '17:00', loc: 'مبنى الخدمات - قاعة القديسة دميانة' },
      { id: 'fam-sec', name: 'ثانوي', type: 'children_class', color: '#4C1D27', day: 'Friday', time: '18:30', loc: 'مبنى الخدمات - مسرح الكنيسة' },
      { id: 'fam-servant-prep', name: 'إعداد خدام', type: 'servants_group', color: '#B35368', day: 'Sunday', time: '19:00', loc: 'قاعة البابا كيرلس السادس' },
      { id: 'fam-servants', name: 'خدام', type: 'servants_group', color: '#702C3B', day: 'Sunday', time: '20:30', loc: 'الكنيسة الكبرى' },
      { id: 'fam-couples', name: 'أسر', type: 'family_group', color: '#3A141D', day: 'Tuesday', time: '19:30', loc: 'قاعة الاجتماعات الرئيسية' },
    ];

    for (const fam of initialFamilies) {
      db.prepare(`
        INSERT INTO families (id, name, type, academic_year_id, meeting_day, meeting_time, location, color_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fam.id, fam.name, fam.type, yearId, fam.day, fam.time, fam.loc, fam.color);
    }

    // 4. Create Users (The Four Core Roles)
    // ROLE 1: Priest
    const priestUserId = 'usr-priest-daoud';
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, avatar_url, is_active)
      VALUES (?, ?, ?, ?, 'priest', '/avatars/priest.jpg', 1)
    `).run(priestUserId, 'priest@organa.eg', 'القمص داود جرجس', '01221234567');

    // ROLE 2: Service Secretary
    const secretaryUserId = 'usr-secretary-mina';
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, avatar_url, is_active)
      VALUES (?, ?, ?, ?, 'service_secretary', '/avatars/mina.jpg', 1)
    `).run(secretaryUserId, 'secretary@organa.eg', 'الشماس مينا عاطف', '01289876543');

    // ROLE 3: Family Leader (إعدادي بنين)
    const leaderMarkUserId = 'usr-leader-mark';
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, avatar_url, assigned_family_id, is_active)
      VALUES (?, ?, ?, ?, 'family_leader', '/avatars/mark.jpg', 'fam-prep-boys', 1)
    `).run(leaderMarkUserId, 'leader.ebn@organa.eg', 'الخادم مارك مجدي', '01004567890');

    // Update family leader link
    db.prepare(`UPDATE families SET leader_id = ? WHERE id = 'fam-prep-boys'`).run(leaderMarkUserId);

    // ROLE 4: Servant (in إعدادي بنين)
    const servantPeterUserId = 'usr-servant-peter';
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, avatar_url, assigned_family_id, is_active)
      VALUES (?, ?, ?, ?, 'servant', '/avatars/peter.jpg', 'fam-prep-boys', 1)
    `).run(servantPeterUserId, 'servant.peter@organa.eg', 'الخادم بيتر ناصر', '01112345678');

    // Additional Leaders & Servants for other families
    const otherUsers = [
      { id: 'usr-leader-samir', name: 'الخادم سمير يوسف', email: 'samir@organa.eg', phone: '01011112222', role: 'family_leader', fam: 'fam-nursery' },
      { id: 'usr-leader-mary', name: 'الخادمة مريم فؤاد', email: 'mary@organa.eg', phone: '01233334444', role: 'family_leader', fam: 'fam-prep-girls' },
      { id: 'usr-servant-andrew', name: 'الخادم أندرو نبيل', email: 'andrew@organa.eg', phone: '01022223333', role: 'servant', fam: 'fam-prep-boys' },
      { id: 'usr-servant-fady', name: 'الخادم فادي سمير', email: 'fady@organa.eg', phone: '01155556666', role: 'servant', fam: 'fam-prep-boys' },
      { id: 'usr-servant-kirollos', name: 'الخادم كيرلس صبحي', email: 'kirollos@organa.eg', phone: '01277778888', role: 'servant', fam: 'fam-sec' },
      { id: 'usr-servant-sarah', name: 'الخادمة سارة عماد', email: 'sarah@organa.eg', phone: '01099990000', role: 'servant', fam: 'fam-prep-girls' },
    ];

    for (const u of otherUsers) {
      db.prepare(`
        INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(u.id, u.email, u.name, u.phone, u.role, u.fam);

      if (u.role === 'family_leader') {
        db.prepare(`UPDATE families SET leader_id = ? WHERE id = ?`).run(u.id, u.fam);
      }
    }

    // 5. Create Servants Records
    const servantsList = [
      { id: 'srv-mark', userId: leaderMarkUserId, name: 'مارك مجدي', phone: '01004567890', joined: '2019-10-01', job: 'مهندس برمجيات' },
      { id: 'srv-peter', userId: servantPeterUserId, name: 'بيتر ناصر', phone: '01112345678', joined: '2021-09-15', job: 'طبيب بشري' },
      { id: 'srv-andrew', userId: 'usr-servant-andrew', name: 'أندرو نبيل', phone: '01022223333', joined: '2022-02-10', job: 'محاسب' },
      { id: 'srv-fady', userId: 'usr-servant-fady', name: 'فادي سمير', phone: '01155556666', joined: '2020-07-01', job: 'صيدلي' },
      { id: 'srv-samir', userId: 'usr-leader-samir', name: 'سمير يوسف', phone: '01011112222', joined: '2018-09-01', job: 'مدرس لغة إنجليزية' },
      { id: 'srv-mary', userId: 'usr-leader-mary', name: 'مريم فؤاد', phone: '01233334444', joined: '2017-04-12', job: 'معلمة رياض أطفال' },
      { id: 'srv-kirollos', userId: 'usr-servant-kirollos', name: 'كيرلس صبحي', phone: '01277778888', joined: '2023-01-20', job: 'مهندس مدني' },
      { id: 'srv-sarah', userId: 'usr-servant-sarah', name: 'سارة عماد', phone: '01099990000', joined: '2021-11-05', job: 'طبيبة أسنان' },
    ];

    for (const s of servantsList) {
      db.prepare(`
        INSERT INTO servants (id, user_id, full_name, phone, job_or_study, joining_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(s.id, s.userId, s.name, s.phone, s.job, s.joined);
    }

    // Assign servants to families
    const assignments = [
      { id: 'fsa-1', fam: 'fam-prep-boys', srv: 'srv-mark', role: 'أمين الأسرة' },
      { id: 'fsa-2', fam: 'fam-prep-boys', srv: 'srv-peter', role: 'خادم ومسؤول افتقاد' },
      { id: 'fsa-3', fam: 'fam-prep-boys', srv: 'srv-andrew', role: 'خادم نشاط وورش' },
      { id: 'fsa-4', fam: 'fam-prep-boys', srv: 'srv-fady', role: 'خادم درس ووسائل إيضاح' },
      { id: 'fsa-5', fam: 'fam-nursery', srv: 'srv-samir', role: 'أمين الأسرة' },
      { id: 'fsa-6', fam: 'fam-prep-girls', srv: 'srv-mary', role: 'أمينة الأسرة' },
      { id: 'fsa-7', fam: 'fam-prep-girls', srv: 'srv-sarah', role: 'خادمة ومسؤولة ألحان' },
      { id: 'fsa-8', fam: 'fam-sec', srv: 'srv-kirollos', role: 'خادم ثانوي' },
    ];

    for (const a of assignments) {
      db.prepare(`
        INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(a.id, a.fam, a.srv, yearId, a.role);
    }

    // 6. Served Members (إعدادي بنين and others)
    const prepMembers = ['mem-101', 'mem-102', 'mem-103', 'mem-104', 'mem-105', 'mem-106', 'mem-107', 'mem-108', 'mem-109', 'mem-110'];
    const membersData = [
      { id: 'mem-101', code: 'EB-101', name: 'جورج رفيق منير', gender: 'male', dob: '2012-05-14', fam: 'fam-prep-boys', srv: 'srv-peter', gName: 'رفيق منير', gPhone: '01223344551', addr: 'سندبيس - بجوار الكنيسة' },
      { id: 'mem-102', code: 'EB-102', name: 'ديفيد أيمن فريد', gender: 'male', dob: '2012-08-20', fam: 'fam-prep-boys', srv: 'srv-peter', gName: 'أيمن فريد', gPhone: '01099887766', addr: 'سندبيس - شارع المحطة' },
      { id: 'mem-103', code: 'EB-103', name: 'أنطونيوس سامح نجيب', gender: 'male', dob: '2012-11-03', fam: 'fam-prep-boys', srv: 'srv-peter', gName: 'سامح نجيب', gPhone: '01122334455', addr: 'سندبيس - السوق' },
      { id: 'mem-104', code: 'EB-104', name: 'فيلوباتير عاطف غالي', gender: 'male', dob: '2013-02-17', fam: 'fam-prep-boys', srv: 'srv-andrew', gName: 'عاطف غالي', gPhone: '01255667788', addr: 'سندبيس - الطريق السريع' },
      { id: 'mem-105', code: 'EB-105', name: 'كيرلس عماد شوقي', gender: 'male', dob: '2013-06-25', fam: 'fam-prep-boys', srv: 'srv-andrew', gName: 'عماد شوقي', gPhone: '01066778899', addr: 'سندبيس - حارة القديس مارجرجس' },
      { id: 'mem-106', code: 'EB-106', name: 'مينا هاني حبيب', gender: 'male', dob: '2013-09-12', fam: 'fam-prep-boys', srv: 'srv-fady', gName: 'هاني حبيب', gPhone: '01144556677', addr: 'سندبيس - مدرسة سندبيس' },
      { id: 'mem-107', code: 'EB-107', name: 'يوسف هاني صليب', gender: 'male', dob: '2012-03-30', fam: 'fam-prep-boys', srv: 'srv-fady', gName: 'هاني صليب', gPhone: '01277889900', addr: 'سندبيس - مساكن الكنيسة' },
      { id: 'mem-108', code: 'EB-108', name: 'بيشوي مجدي زكي', gender: 'male', dob: '2013-01-09', fam: 'fam-prep-boys', srv: 'srv-peter', gName: 'مجدي زكي', gPhone: '01011223344', addr: 'سندبيس - شارع داير الناحية' },
      { id: 'mem-109', code: 'EB-109', name: 'توماس أسامة فوزي', gender: 'male', dob: '2012-07-19', fam: 'fam-prep-boys', srv: 'srv-peter', gName: 'أسامة فوزي', gPhone: '01188990011', addr: 'سندبيس - بحري الترعة' },
      { id: 'mem-110', code: 'EB-110', name: 'مكسيموس ناصر عزيز', gender: 'male', dob: '2013-10-05', fam: 'fam-prep-boys', srv: 'srv-andrew', gName: 'ناصر عزيز', gPhone: '01299001122', addr: 'سندبيس - الوسطاني' },
      // Girls
      { id: 'mem-201', code: 'EG-201', name: 'مارينا إميل رشدي', gender: 'female', dob: '2012-04-10', fam: 'fam-prep-girls', srv: 'srv-sarah', gName: 'إميل رشدي', gPhone: '01012341234', addr: 'سندبيس' },
      { id: 'mem-202', code: 'EG-202', name: 'كارين سامي لمعي', gender: 'female', dob: '2013-03-15', fam: 'fam-prep-girls', srv: 'srv-sarah', gName: 'سامي لمعي', gPhone: '01234563456', addr: 'سندبيس' },
      // Nursery
      { id: 'mem-301', code: 'NUR-301', name: 'يوحنا مينا إبراهيم', gender: 'male', dob: '2021-02-11', fam: 'fam-nursery', srv: 'srv-samir', gName: 'مينا إبراهيم', gPhone: '01123451234', addr: 'سندبيس' },
    ];

    for (const m of membersData) {
      db.prepare(`
        INSERT INTO served_members (
          id, code, full_name, gender, birth_date, current_family_id, assigned_servant_id,
          guardian_name, guardian_phone, address, registration_date, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-09-01', 1)
      `).run(m.id, m.code, m.name, m.gender, m.dob, m.fam, m.srv, m.gName, m.gPhone, m.addr);

      // Add to member_history
      db.prepare(`
        INSERT INTO member_history (id, member_id, event_type, from_value, to_value, description, academic_year_id, created_by)
        VALUES (?, ?, 'registration', NULL, ?, ?, ?, ?)
      `).run(`hist-${m.id}`, m.id, m.fam, `تم تسجيل المخدوم بأسرة ${m.fam}`, yearId, priestUserId);
    }

    // 7. Meetings for إعدادي بنين (4 Weekly Meetings across Oct/Nov 2026)
    const meetings = [
      {
        id: 'mtg-01',
        date: '2026-10-23',
        title: 'اللقاء الأسبوعي — أمانة في القليل',
        lesson: 'الأمانة في حياة يوسف الصديق',
        topic: 'الفضائل المسيحية وبناء الشخصية',
        status: 'completed',
        reportStatus: 'approved',
      },
      {
        id: 'mtg-02',
        date: '2026-10-30',
        title: 'اللقاء الأسبوعي — الشجاعة والشهادة للمسيح',
        lesson: 'داود وجليات — الثقة في قوة إله الجنود',
        topic: 'مواجهة التحديات ومحاربات الإحباط',
        status: 'completed',
        reportStatus: 'approved',
      },
      {
        id: 'mtg-03',
        date: '2026-11-06',
        title: 'اللقاء الأسبوعي — الصداقة النقية',
        lesson: 'داود ويوناثان — نموذج الصديق الحقيقي',
        topic: 'العلاقات وبناء الصداقات الصالحة',
        status: 'completed',
        reportStatus: 'under_review', // Ready for secretary review
      },
      {
        id: 'mtg-04',
        date: '2026-11-13',
        title: 'اللقاء الأسبوعي — الصلاة الدائمة سر القوة',
        lesson: 'دانيال في جب الأسود ورئيس الملائكة ميخائيل',
        topic: 'حياة الصلاة والأصوام في سن المراهقة',
        status: 'completed',
        reportStatus: 'submitted', // Awaiting secretary review
      },
    ];

    for (const mtg of meetings) {
      db.prepare(`
        INSERT INTO meetings (
          id, family_id, academic_year_id, title, date, start_time, end_time,
          lesson_title, lesson_topic, status, created_by
        ) VALUES (?, 'fam-prep-boys', ?, ?, ?, '17:00', '19:00', ?, ?, ?, ?)
      `).run(mtg.id, yearId, mtg.title, mtg.date, mtg.lesson, mtg.topic, mtg.status, leaderMarkUserId);

      // Dynamic Activities per Meeting (CRITICAL FEATURE: Multiple activities per meeting)
      const activities = [
        { id: `act-${mtg.id}-1`, title: 'الفقرة الافتتاحية والصلاة', order: 1, desc: 'ترديد مزمور التوبة وصلاة الشكر' },
        { id: `act-${mtg.id}-2`, title: 'الألحان والتسبيح', order: 2, desc: 'لحن آجيوس بالهزات القبطية' },
        { id: `act-${mtg.id}-3`, title: 'تحضير وشرح الدرس', order: 3, desc: mtg.lesson },
        { id: `act-${mtg.id}-4`, title: 'وسيلة إيضاح تفاعلية ومجسم', order: 4, desc: 'عرض بروجيكتور ومجسم تاريخي' },
        { id: `act-${mtg.id}-5`, title: 'ورشة عمل وتطبيقات عملية', order: 5, desc: 'مجموعات عمل ومناقشة الآيات الحية' },
        { id: `act-${mtg.id}-6`, title: 'مسابقة وفقرة تشجيعية وتوزيع هدايا', order: 6, desc: 'مسابقة أسئلة سريعة على كاهوت وتوزيع هدايا' },
      ];

      for (const act of activities) {
        db.prepare(`
          INSERT INTO meeting_activities (id, meeting_id, title, description, order_index)
          VALUES (?, ?, ?, ?, ?)
        `).run(act.id, mtg.id, act.title, act.desc, act.order);

        // Assign MULTIPLE servants to each activity with separate responsibilities & participation statuses
        if (act.order === 1) {
          // Opening: Servant Mark (Main Presenter) & Servant Peter (Assistant)
          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'main_presenter', 'assigned', 'participated')
          `).run(`asn-${act.id}-1`, act.id, 'srv-mark');

          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'assistant', 'assigned', 'participated')
          `).run(`asn-${act.id}-2`, act.id, 'srv-peter');
        } else if (act.order === 2) {
          // Hymns: Servant Andrew (Presenter) & Servant Peter (Participant)
          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'presenter', 'assigned', 'participated')
          `).run(`asn-${act.id}-1`, act.id, 'srv-andrew');

          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'participant', 'assigned', 'participated')
          `).run(`asn-${act.id}-2`, act.id, 'srv-peter');
        } else if (act.order === 3) {
          // Lesson: Servant Fady (Lesson Preparer) & Servant Mark (Main Presenter / Explanation)
          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'lesson_preparer', 'assigned', 'participated')
          `).run(`asn-${act.id}-1`, act.id, 'srv-fady');

          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'main_presenter', 'assigned', 'participated')
          `).run(`asn-${act.id}-2`, act.id, 'srv-mark');
        } else if (act.order === 4) {
          // Visual Aid: Servant Peter (Organizer) & Servant Andrew (Tech Support)
          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'organizer', 'assigned', 'participated')
          `).run(`asn-${act.id}-1`, act.id, 'srv-peter');

          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'tech_support', 'assigned', 'participated')
          `).run(`asn-${act.id}-2`, act.id, 'srv-andrew');
        } else if (act.order === 5) {
          // Workshop: Servant Mark, Servant Peter, Servant Andrew, Servant Fady
          const srvs = ['srv-mark', 'srv-peter', 'srv-andrew', 'srv-fady'];
          srvs.forEach((srvId, idx) => {
            db.prepare(`
              INSERT INTO meeting_activity_assignments (
                id, activity_id, servant_id, responsibility, assignment_status, participation_status
              ) VALUES (?, ?, ?, 'participant', 'assigned', 'participated')
            `).run(`asn-${act.id}-${idx}`, act.id, srvId);
          });
        } else {
          // Competition: Servant Fady (Presenter)
          db.prepare(`
            INSERT INTO meeting_activity_assignments (
              id, activity_id, servant_id, responsibility, assignment_status, participation_status
            ) VALUES (?, ?, ?, 'presenter', 'assigned', 'participated')
          `).run(`asn-${act.id}-1`, act.id, 'srv-fady');
        }
      }

      // Member Attendance
      // For mtg-01, 02, 03, 04
      let presentCount = 0;
      let absentCount = 0;
      let excusedCount = 0;

      for (const memId of prepMembers) {
        let status: 'present' | 'absent' | 'excused' = 'present';
        let excuse: string | null = null;

        if (memId === 'mem-108' && mtg.id !== 'mtg-01') {
          status = 'absent';
        } else if (memId === 'mem-107' && mtg.id === 'mtg-04') {
          status = 'excused';
          excuse = 'ظروف سفر مع الأسرة';
        } else if (memId === 'mem-110' && mtg.id === 'mtg-03') {
          status = 'absent';
        }

        if (status === 'present') presentCount++;
        else if (status === 'absent') absentCount++;
        else excusedCount++;

        db.prepare(`
          INSERT INTO meeting_attendance (id, meeting_id, member_id, status, excuse_reason, recorded_by, recorded_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(`att-${mtg.id}-${memId}`, mtg.id, memId, status, excuse, leaderMarkUserId, `${mtg.date} 17:30:00`);
      }

      // Servant Attendance
      const familyServants = ['srv-mark', 'srv-peter', 'srv-andrew', 'srv-fady'];
      for (const srvId of familyServants) {
        db.prepare(`
          INSERT INTO servant_attendance (id, meeting_id, servant_id, status, recorded_by, recorded_at)
          VALUES (?, ?, ?, 'present', ?, ?)
        `).run(`satt-${mtg.id}-${srvId}`, mtg.id, srvId, leaderMarkUserId, `${mtg.date} 17:00:00`);
      }

      // Weekly Notebook / Report (الكشكول الإلكتروني)
      const reportId = `rep-${mtg.id}`;
      db.prepare(`
        INSERT INTO weekly_reports (
          id, meeting_id, family_id, academic_year_id, meeting_date, lesson_title, lesson_topic,
          total_members_count, present_members_count, absent_members_count, excused_members_count,
          total_servants_count, present_servants_count,
          opening_paragraph_notes, visual_aid_notes, workshop_notes, competition_notes,
          general_notes, followup_requirements, status,
          submitted_at, submitted_by, reviewed_at, reviewed_by, review_notes
        ) VALUES (
          ?, ?, 'fam-prep-boys', ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        reportId, mtg.id, yearId, mtg.date, mtg.lesson, mtg.topic,
        prepMembers.length, presentCount, absentCount, excusedCount,
        familyServants.length, familyServants.length,
        'تم بدء الاجتماع في الموعد بصلاة الشكر وتلاوة مزمور التوبة بمشاركة جميع المخدومين بتفاعل ممتاز',
        'تم استخدام بروجيكتور لعرض فيلم قصير توضيحي ومجسم تفاعلي أعده الخادم بيتر ناصر',
        'تم تقسيم المخدومين إلى 3 مجموعات عمل لتطبيق الدروس المستفادة وكتابة الآية الحفظ',
        'مسابقة أسئلة سريعة وتم توزيع هدايا رمزية وتشجيع المتميزين',
        'حضور مشجع والتزام ملحوظ بالانضباط وهدوء الكنيسة',
        'مطلوب افتقاد بيشوي مجدي زكي لغيابه المتكرر 3 أسابيع والتواصل مع والده',
        mtg.reportStatus,
        mtg.reportStatus !== 'draft' ? `${mtg.date} 21:00:00` : null,
        mtg.reportStatus !== 'draft' ? leaderMarkUserId : null,
        mtg.reportStatus === 'approved' ? `${mtg.date} 23:00:00` : null,
        mtg.reportStatus === 'approved' ? secretaryUserId : null,
        mtg.reportStatus === 'approved' ? 'تقرير مكتمل ومنظم ومبارك، الرب يبارك خدمتكم وتعب محبتكم' : null
      );

      // Report Status History
      db.prepare(`
        INSERT INTO weekly_report_status_history (id, report_id, from_status, to_status, changed_by, changed_by_name, comment)
        VALUES (?, ?, 'draft', 'submitted', ?, 'الخادم مارك مجدي', 'تم تسليم الكشكول الأسبوعي للمراجعة والاعتماد')
      `).run(`rsh-${mtg.id}-1`, reportId, leaderMarkUserId);

      if (mtg.reportStatus === 'approved') {
        db.prepare(`
          INSERT INTO weekly_report_status_history (id, report_id, from_status, to_status, changed_by, changed_by_name, comment)
          VALUES (?, ?, 'submitted', 'approved', ?, 'الشماس مينا عاطف', 'تم اعتماد تقرير اللقاء بنجاح')
        `).run(`rsh-${mtg.id}-2`, reportId, secretaryUserId);
      }
    }

    // 8. Spiritual Follow-up records (Liturgy, Communion, Sunday School)
    // For past 2 weeks for prep boys
    const dates = ['2026-11-06', '2026-11-13'];
    for (const d of dates) {
      for (const mem of prepMembers) {
        const isLiturgy = mem === 'mem-108' ? 'no' : 'yes';
        const isCommunion = mem === 'mem-108' ? 'no' : (mem === 'mem-105' ? 'not_recorded' : 'yes');
        const isSS = mem === 'mem-108' ? 'no' : 'yes';

        db.prepare(`
          INSERT INTO spiritual_followups (
            id, member_id, academic_year_id, date, liturgy_attendance, communion_attendance,
            sunday_school_attendance, general_followup_status, recorded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'yes', ?)
        `).run(`spf-${d}-${mem}`, mem, yearId, d, isLiturgy, isCommunion, isSS, 'srv-peter');
      }
    }

    // 9. Absence Alert: Member mem-108 (بيشوي مجدي زكي) missed 3 consecutive meetings
    const alertId = 'alt-mem-108';
    db.prepare(`
      INSERT INTO absence_alerts (
        id, member_id, family_id, assigned_servant_id, consecutive_absences_count,
        last_attendance_date, status, suggested_action
      ) VALUES (?, 'mem-108', 'fam-prep-boys', 'srv-peter', 3, '2026-10-23', 'pending_followup', ?)
    `).run(alertId, 'الاتصال بولي الأمر أو زيارة منزلية لمعرفة سبب الغياب 3 أسابيع متتالية');

    // Follow-up task for Servant Peter
    db.prepare(`
      INSERT INTO followup_tasks (
        id, alert_id, member_id, servant_id, task_type, notes, is_completed, due_date
      ) VALUES (?, ?, 'mem-108', 'srv-peter', 'phone_call', ?, 0, '2026-11-15')
    `).run('tsk-108', alertId, 'الاتصال بالأستاذ مجدي زكي (والد بيشوي) للاطمئنان عليه ومتابعة سبب الغياب');

    // 10. Audit Logs
    const auditLogs = [
      { action: 'SYSTEM_INIT', type: 'system', id: 'sys-0', desc: 'تهيئة منصة أورجانا لكنيسة الشهيد العظيم مارجرجس بسندبيس بواسطة مدار للتقنية', uId: priestUserId, uName: 'القمص داود جرجس', role: 'priest' },
      { action: 'CREATE_FAMILY', type: 'families', id: 'fam-prep-boys', desc: 'إنشاء أسرة إعدادي بنين وتعيين الخادم مارك مجدي أميناً للأسرة', uId: secretaryUserId, uName: 'الشماس مينا عاطف', role: 'service_secretary' },
      { action: 'ASSIGN_SERVANT', type: 'family_servants', id: 'fsa-2', desc: 'تعيين الخادم بيتر ناصر بأسرة إعدادي بنين وتكليفه بمسؤولية الافتقاد', uId: secretaryUserId, uName: 'الشماس مينا عاطف', role: 'service_secretary' },
      { action: 'SUBMIT_REPORT', type: 'weekly_reports', id: 'rep-mtg-04', desc: 'تسليم كشكول اللقاء الأسبوعي للقاء (الصلاة الدائمة سر القوة) للمراجعة', uId: leaderMarkUserId, uName: 'الخادم مارك مجدي', role: 'family_leader' },
    ];

    for (const log of auditLogs) {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, user_role, action, record_type, record_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`aud-${Math.random().toString(36).substring(2, 9)}`, log.uId, log.uName, log.role, log.action, log.type, log.id, log.desc);
    }
  });

  transaction();
  console.log('ORGANA St. George Sandbees database successfully seeded!');
}
