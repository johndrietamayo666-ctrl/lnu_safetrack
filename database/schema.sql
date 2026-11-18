-- ==========================================================
-- LNU SafeTrack - FINALIZED Schema & Demo Data
-- Password for ALL accounts is: Password123
-- ==========================================================



SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS archived_threads;
DROP TABLE IF EXISTS violations;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS incident_parties;
DROP TABLE IF EXISTS lost_property;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS guest_accounts;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS TABLE
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institutional_id VARCHAR(50) NOT NULL UNIQUE, 
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80) NULL,
    last_name VARCHAR(80) NOT NULL,
    full_name VARCHAR(150) NOT NULL, 
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student','staff','admin') NOT NULL,
    status ENUM('active','blocked') NOT NULL DEFAULT 'active',
    profile_pic VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. GUEST ACCOUNTS TABLE
CREATE TABLE guest_accounts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guest_no VARCHAR(50) NOT NULL UNIQUE, 
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80) NULL,
    last_name VARCHAR(80) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    valid_id VARCHAR(120) NOT NULL,
    id_photo_path VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending','verified','rejected','blocked') NOT NULL DEFAULT 'pending',
    verified_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. INCIDENTS TABLE
CREATE TABLE incidents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_no VARCHAR(30) NOT NULL UNIQUE,
    reporter_id INT UNSIGNED NULL,
    guest_id INT UNSIGNED NULL,
    reporter_type ENUM('student','staff','guest') NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    location_scope ENUM('campus','dagupan') NOT NULL DEFAULT 'campus',
    severity ENUM('minor','severe') NOT NULL,
    status ENUM('submitted','reviewed','rejected','resolved') NOT NULL DEFAULT 'submitted',
    photo_path VARCHAR(255) NULL,
    video_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES guest_accounts(id) ON DELETE SET NULL
);

-- 4. LOST PROPERTY TABLE
CREATE TABLE lost_property (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_no VARCHAR(30) NOT NULL UNIQUE,
    reporter_id INT UNSIGNED NULL,
    guest_id INT UNSIGNED NULL,
    reporter_type ENUM('student','staff','guest') NOT NULL,
    item_name VARCHAR(180) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    last_seen_lat DECIMAL(10,7) NOT NULL,
    last_seen_lng DECIMAL(10,7) NOT NULL,
    last_seen_place VARCHAR(200) NULL,
    photo_path VARCHAR(255) NULL,
    status ENUM('submitted','lost','found','claimed','closed','rejected') NOT NULL DEFAULT 'submitted',
    owner_id INT UNSIGNED NULL,
    owner_guest_id INT UNSIGNED NULL,
    claimed_by_id INT UNSIGNED NULL,
    claimed_by_guest_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES guest_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_guest_id) REFERENCES guest_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (claimed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (claimed_by_guest_id) REFERENCES guest_accounts(id) ON DELETE SET NULL
);

-- 5. INCIDENT PARTIES TABLE
CREATE TABLE incident_parties (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    incident_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NULL,
    guest_id INT UNSIGNED NULL,
    role ENUM('victim','witness','suspect') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES guest_accounts(id) ON DELETE CASCADE
);

-- 6. MESSAGES TABLE
CREATE TABLE messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id INT UNSIGNED NULL,
    guest_id INT UNSIGNED NULL,
    recipient_staff_id INT UNSIGNED NULL,
    message TEXT NOT NULL,
    thread_user_id INT UNSIGNED NULL,
    thread_guest_id INT UNSIGNED NULL,
    thread_staff_id INT UNSIGNED NULL,
    from_staff TINYINT(1) NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    attachment_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES guest_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_staff_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. ARCHIVED THREADS TABLE
CREATE TABLE archived_threads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    thread_type VARCHAR(20) NOT NULL, 
    thread_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_thread (staff_id, thread_type, thread_id),
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    guest_id INT UNSIGNED NULL,
    message VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NULL,
    action_id INT UNSIGNED NULL,
    severity VARCHAR(20) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES guest_accounts(id) ON DELETE CASCADE
);

-- 9. VIOLATIONS TABLE
CREATE TABLE violations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    guest_id INT UNSIGNED NULL,
    issued_by INT UNSIGNED NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES guest_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================================
-- DUMMY DATA (Password: Password123)
-- ==========================================================

INSERT INTO users (id, institutional_id, first_name, middle_name, last_name, full_name, username, email, password_hash, role, status, profile_pic) VALUES 
(1, 'ADMIN-001', 'LNU', 'System', 'Admin', 'LNU System Admin', 'admin1', 'admin@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'admin', 'active', 'uploads/profiles/admin_avatar.jpg'),
(2, 'EMP-1001', 'Maria', '', 'Santos', 'Maria Santos (SAO)', 'staff1', 'sao@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'staff', 'active', NULL),
(3, 'EMP-1002', 'Chief', '', 'Security', 'Chief Security', 'staff2', 'security@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'staff', 'active', NULL),
(4, 'STUD-2024-001', 'Alice', 'Reyes', 'Reyes', 'Alice Reyes', 'student1', 'alice@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'student', 'active', NULL),
(5, 'STUD-2024-002', 'John', 'Dela', 'Cruz', 'John Dela Cruz', 'student2', 'john@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'student', 'active', NULL),
(6, 'STUD-2024-003', 'Jane', '', 'Smith', 'Jane Smith', 'student3', 'jane@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'student', 'active', NULL),
(7, 'STUD-2024-004', 'Mark', '', 'Johnson', 'Mark Johnson', 'student4', 'mark@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'student', 'active', NULL),
(8, 'STUD-2024-005', 'Bob', '', 'Santos', 'Bob Santos', 'student5', 'bob@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'student', 'active', NULL),
(9, 'STUD-2024-006', 'Charlie', '', 'Brown', 'Charlie Brown', 'student6', 'charlie@lnu.edu.ph', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCS4bZJ18JuywdSEgV28XjCkUuJ1O', 'student', 'active', NULL);

INSERT INTO guest_accounts (id, guest_no, first_name, middle_name, last_name, full_name, email, phone, valid_id, id_photo_path, reason, status, verified_by) VALUES
(1, 'GST-1001', 'Parent', '', 'of Alice', 'Parent of Alice', 'parent@test.com', '09111111111', 'PhilHealth ID: 12-3456789', 'uploads/ids/guest_id_parent.jpg', 'Visiting daughter', 'verified', 2),
(2, 'GST-1002', 'Delivery', '', 'Rider', 'Delivery Rider', 'rider@test.com', '09222222222', 'Driver\'s License: D01-23-456', 'uploads/ids/guest_id_rider.jpg', 'Delivering package', 'pending', NULL),
(3, 'GST-1003', 'Alumni', '', 'Visitor', 'Alumni Visitor', 'alumni@test.com', '09333333333', 'Passport: P1234567', 'uploads/ids/guest_id_alumni.jpg', 'Attending event', 'verified', 2),
(4, 'GST-1004', 'Unknown', '', 'Guest', 'Unknown Guest', 'unknown@test.com', '09444444444', 'UMID: 9876-5432', 'uploads/ids/guest_id_parent.jpg', 'Inquiring', 'pending', NULL),
(5, 'GST-1005', 'Scammer', '', 'Guy', 'Scammer Guy', 'scam@test.com', '09555555555', 'Fake ID: 0000', 'uploads/ids/guest_id_parent.jpg', 'Trespassing', 'blocked', NULL);

-- INCIDENTS
INSERT INTO incidents (id, case_no, reporter_id, guest_id, reporter_type, category, title, description, latitude, longitude, location_scope, severity, status, photo_path, video_path) VALUES
(1, 'LNU-INC-2024-000001', 4, NULL, 'student', 'hazard', 'Broken Glass in Gym', 'Shattered glass pieces on the basketball court floor.', 16.03685, 120.33064, 'campus', 'minor', 'reviewed', 'uploads/evidence/inc_gym_glass.jpg', NULL),
(2, 'LNU-INC-2024-000002', 6, NULL, 'student', 'crime', 'Stolen Laptop in Library', 'Left my laptop for 5 mins on the table and it was gone.', 16.03630, 120.33040, 'campus', 'severe', 'resolved', 'uploads/evidence/inc_library_theft.jpg', NULL),
(3, 'LNU-INC-2024-000003', 7, NULL, 'student', 'bullying', 'Verbal Bullying near Covered Court', 'A group of seniors is verbally harassing a freshman.', 16.03512, 120.32993, 'campus', 'severe', 'submitted', NULL, 'uploads/evidence/inc_video_bullying.mp4'),
(4, 'LNU-INC-2024-000004', 8, NULL, 'student', 'medical', 'Student Fainted in CR', 'A student fainted inside the 2nd floor restroom.', 16.03590, 120.33080, 'campus', 'severe', 'resolved', 'uploads/evidence/inc_cr_faint.jpg', NULL),
(5, 'LNU-INC-2024-000005', 9, NULL, 'student', 'fire', 'Small Fire in Chem Lab', 'A bunsen burner caught a paper on fire. Extinguished quickly.', 16.03650, 120.33020, 'campus', 'severe', 'reviewed', 'uploads/evidence/inc_chem_fire.jpg', NULL),
(6, 'LNU-INC-2024-000006', 5, NULL, 'student', 'other', 'Aliens landed on track oval', 'There are UFOs.', 16.03480, 120.33150, 'campus', 'severe', 'rejected', NULL, NULL),
(7, 'LNU-INC-2024-000007', 4, NULL, 'student', 'crime', 'Snatching near SM Dagupan', 'Phone snatched while walking to SM.', 16.04439, 120.34371, 'dagupan', 'severe', 'reviewed', 'uploads/evidence/inc_sm_snatch.jpg', NULL),
(8, 'LNU-INC-2024-000008', NULL, 1, 'guest', 'medical', 'Student Fainted Outside Gate', 'A student fainted near the main gate.', 16.03550, 120.33176, 'dagupan', 'severe', 'submitted', 'uploads/evidence/inc_gate_outside.jpg', NULL),
(9, 'LNU-INC-2024-000009', 6, NULL, 'student', 'hazard', 'Fallen tree branch', 'A large branch is blocking the sidewalk.', 16.03800, 120.33400, 'dagupan', 'minor', 'reviewed', NULL, NULL);

INSERT INTO incident_parties (incident_id, user_id, guest_id, role) VALUES
(2, 6, NULL, 'victim'), (2, 5, NULL, 'suspect'),
(3, 4, NULL, 'victim'), (3, 5, NULL, 'suspect'), (3, 7, NULL, 'witness');

-- LOST PROPERTY
INSERT INTO lost_property (id, case_no, reporter_id, guest_id, reporter_type, item_name, category, description, last_seen_lat, last_seen_lng, last_seen_place, status, owner_id, claimed_by_guest_id, photo_path) VALUES
(1, 'LNU-LP-2024-000001', 9, NULL, 'student', 'Black Leather Wallet', 'wallet', 'Black wallet with a cross logo.', 16.03627, 120.33056, 'Cafeteria', 'lost', NULL, NULL, 'uploads/evidence/lost_wallet.jpg'),
(2, 'LNU-LP-2024-000002', 4, NULL, 'student', 'iPhone 13 (Cherry Case)', 'phone', 'Black iPhone with cherry case.', 16.03681, 120.33062, 'Gym Bleachers', 'claimed', 4, 1, 'uploads/evidence/lost_iphone.jpg'),
(3, 'LNU-LP-2024-000003', NULL, 3, 'guest', 'LNU Student ID', 'id', 'Found an ID near SM Dagupan.', 16.04476, 120.34310, 'SM Dagupan', 'claimed', 6, NULL, 'uploads/evidence/lost_id.jpg'),
(4, 'LNU-LP-2024-000004', 8, NULL, 'student', 'Blue Umbrella', 'other', 'Left umbrella in Room 302.', 16.03573, 120.33018, 'Room 302', 'submitted', NULL, NULL, NULL),
(5, 'LNU-LP-2024-000005', 7, NULL, 'student', 'Honda Car Keys', 'other', 'Keys with a blue lanyard.', 16.03620, 120.33010, 'Parking Lot', 'submitted', NULL, NULL, NULL),
(6, 'LNU-LP-2024-000006', 5, NULL, 'student', 'Calculator', 'other', 'Casio scientific calculator.', 16.03580, 120.33030, 'Room 401', 'rejected', NULL, NULL, NULL);

-- VIOLATIONS
INSERT INTO violations (id, user_id, guest_id, issued_by, violation_type, description) VALUES
(1, 5, NULL, 2, 'Minor Violation', 'Littering in the hallway.'),
(2, 5, NULL, 2, 'Major Violation', 'Vandalism of school property.'),
(3, 5, NULL, 3, 'False Report / Troll', 'Submitted a fake incident report.'),
(4, 6, NULL, 2, 'Minor Violation', 'Late submission of requirements.'),
(5, 6, NULL, 3, 'Major Violation', 'Loitering in restricted areas.'),
(6, 7, NULL, 2, 'Minor Violation', 'No school uniform.');

-- MESSAGES
INSERT INTO messages (sender_id, guest_id, recipient_staff_id, message, thread_user_id, thread_guest_id, thread_staff_id, from_staff, attachment_path) VALUES
(4, NULL, 2, 'Hi Maam, here is the CCTV screenshot of the stolen laptop.', 4, NULL, 2, 0, 'uploads/chat/chat_cctv.jpg'),
(2, NULL, 4, 'Thank you Alice, we will review this.', 4, NULL, 2, 1, NULL),
(NULL, 1, 3, 'Good day, here is the medical certificate of my daughter.', NULL, 1, 3, 0, 'uploads/chat/chat_document.pdf'),
(3, NULL, 1, 'Received. Thank you for providing this.', NULL, 1, 3, 1, NULL),
(2, NULL, 1, 'Admin, John has 3 strikes now. Can we block him?', 2, NULL, 1, 1, NULL),
(1, NULL, 2, 'Yes, please issue the block.', 2, NULL, 1, 1, NULL),
(3, NULL, 2, 'Maam, we found the lost ID at SM.', 3, NULL, 2, 1, NULL);

-- NOTIFICATIONS
INSERT INTO notifications (user_id, message, action_type, action_id, severity, is_read) VALUES
(2, 'New severe incident reported: Stolen Laptop', 'incident', 2, 'severe', 0),
(2, 'New severe incident reported: Student Fainted in CR', 'incident', 4, 'severe', 0),
(2, 'New lost item reported: Blue Umbrella', 'lost', 4, NULL, 0),
(1, 'New guest pending verification: Delivery Rider', 'guest', 2, NULL, 0),
(1, 'New guest pending verification: Unknown Guest', 'guest', 4, NULL, 0),
(2, 'New message from Alice Reyes', 'msg_student', 4, NULL, 1),
(1, 'New message from Maria Santos', 'message', 2, NULL, 0),
(5, 'CRITICAL: You have reached 3 strikes. Your account has been flagged for blocking.', 'strike', 3, NULL, 0),
(5, 'FINAL WARNING: You now have 2 strikes. Please report to the SAO.', 'strike', 2, NULL, 1),
(6, 'FINAL WARNING: You now have 2 strikes. Please report to the SAO.', 'strike', 5, NULL, 0),
(7, 'WARNING: You have received a Minor Violation. Please be reminded that accumulating 3 strikes will result in an automatic block.', 'strike', 6, NULL, 1);