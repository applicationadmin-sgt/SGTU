# Quiz Unlock System - Complete Implementation

## 🎯 **UNLOCK FLOW & LIMITS**

### **1. Teacher Level (First Tier)**
- **Limit**: Up to 3 unlocks per student per quiz
- **Authority**: Teachers can unlock their own students
- **Escalation**: After 3 teacher unlocks → HOD authorization required

### **2. HOD Level (Second Tier)** 
- **Limit**: Up to 3 unlocks per student per quiz  
- **Authority**: HODs can unlock students in their department
- **Escalation**: After 3 HOD unlocks → Dean authorization required

### **3. Dean Level (Third Tier)**
- **Limit**: UNLIMITED unlocks
- **Authority**: Deans can unlock any student in their institution
- **Escalation**: None (unlimited authority)

### **4. Admin Level (Override)**
- **Limit**: UNLIMITED unlocks 
- **Authority**: System administrators with override capabilities
- **Special**: Can unlock at ANY level, bypassing normal flow

---

## 🔄 **UNLOCK ESCALATION FLOW**

```
Student Fails Quiz
        ↓
   🔒 QUIZ LOCKED
        ↓
📚 Teacher Unlock (1/3) → Student gets +1 attempt
        ↓ (if fails again)
📚 Teacher Unlock (2/3) → Student gets +1 attempt  
        ↓ (if fails again)
📚 Teacher Unlock (3/3) → Student gets +1 attempt
        ↓ (if fails again)
   ⬆️ ESCALATES TO HOD
        ↓
👨‍💼 HOD Unlock (1/3) → Student gets +1 attempt
        ↓ (if fails again) 
👨‍💼 HOD Unlock (2/3) → Student gets +1 attempt
        ↓ (if fails again)
👨‍💼 HOD Unlock (3/3) → Student gets +1 attempt
        ↓ (if fails again)
   ⬆️ ESCALATES TO DEAN
        ↓
👨‍💻 Dean Unlock (∞) → Student gets +1 attempt
        ↓ (can repeat unlimited times)
👨‍💻 Dean Unlock (∞) → Student gets +1 attempt
```

---

## 💪 **ADMIN OVERRIDE**
```
🚨 Admin Override → Can unlock at ANY level
   - Bypasses Teacher/HOD/Dean limits
   - Immediate unlock regardless of current authorization level
   - Used for exceptional cases & violations
```

---

## 📊 **CURRENT STUDENT STATUS EXAMPLE**

**Student: Sourav**
- ✅ Teacher Unlocks: 3/3 (EXHAUSTED) 
- ✅ HOD Unlocks: 5/3 (OVER LIMIT - Legacy data)
- ✅ Dean Unlocks: 0/∞ (AVAILABLE)
- ✅ Admin Unlocks: 0/∞ (AVAILABLE)

**Current Level**: DEAN (unlimited unlocks available)
**Total Attempts**: 9 (1 base + 8 from unlocks)

---

## 🛡️ **SECURITY LOCK INTEGRATION**

All unlock types (Teacher/HOD/Dean/Admin) automatically clear:
- ✅ Quiz failure locks (QuizLock model)  
- ✅ Security violation locks (tab switching, etc.)
- ✅ Both locks cleared in single operation

---

## 🎮 **FRONTEND INTEGRATION**

Each dashboard shows:
- **Teacher Dashboard**: Students requiring teacher unlock (up to 3)
- **HOD Dashboard**: Students requiring HOD unlock (up to 3) 
- **Dean Dashboard**: Students requiring dean unlock (unlimited)
- **Admin Dashboard**: All locked students (override capability)

---

This system provides a **graduated escalation approach** ensuring that:
1. Teachers handle most routine unlocks
2. HODs handle persistent issues  
3. Deans provide final authority for extreme cases
4. Admins can override for system issues

The unlock limits prevent abuse while ensuring no student is permanently blocked.