import { useCallback } from "react";
import { usePOS } from "@/lib/pos-context";
import type {
  StaffMember,
  Shift,
  ShiftType,
  ChecklistType,
  StaffPerformance,
} from "@/lib/types";
import { generateId, initialStaffPerformance } from "@/lib/mock-data";

interface ChecklistProgress {
  checked: number;
  total: number;
  percent: number;
}

export function useStaff() {
  const { state, dispatch } = usePOS();

  const staff = state.staff;
  const shifts = state.shifts;
  const checklist = state.checklist;
  const activeStaffId = state.activeStaffId;

  // === CRUD ===

  const addStaff = useCallback(
    (data: Omit<StaffMember, "id">): void => {
      const member: StaffMember = { ...data, id: generateId() };
      dispatch({ type: "ADD_STAFF", payload: member });
    },
    [dispatch],
  );

  const updateStaff = useCallback(
    (member: StaffMember): void => {
      dispatch({ type: "UPDATE_STAFF", payload: member });
    },
    [dispatch],
  );

  const deleteStaff = useCallback(
    (id: string): void => {
      dispatch({ type: "DELETE_STAFF", payload: id });
    },
    [dispatch],
  );

  const toggleActive = useCallback(
    (id: string): void => {
      const member = staff.find((s) => s.id === id);
      if (!member) return;
      dispatch({
        type: "UPDATE_STAFF",
        payload: { ...member, isActive: !member.isActive },
      });
    },
    [staff, dispatch],
  );

  // === Auth ===

  const login = useCallback(
    (pin: string): StaffMember | null => {
      const member = staff.find((s) => s.pin === pin && s.isActive);
      if (member) {
        dispatch({ type: "SET_ACTIVE_STAFF", payload: member.id });
        return member;
      }
      return null;
    },
    [staff, dispatch],
  );

  const logout = useCallback((): void => {
    dispatch({ type: "SET_ACTIVE_STAFF", payload: null });
  }, [dispatch]);

  const getActiveStaff = useCallback((): StaffMember | null => {
    if (!activeStaffId) return null;
    return staff.find((s) => s.id === activeStaffId) ?? null;
  }, [activeStaffId, staff]);

  // === Shifts ===

  const getShiftsForWeek = useCallback(
    (weekStartDate: string): Shift[] => {
      const start = new Date(weekStartDate);
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
      return shifts.filter((sh) => dates.includes(sh.date));
    },
    [shifts],
  );

  const setShift = useCallback(
    (staffId: string, date: string, type: ShiftType): void => {
      const existing = shifts.find(
        (sh) => sh.staffId === staffId && sh.date === date,
      );
      const shift: Shift = {
        id: existing?.id ?? generateId(),
        staffId,
        date,
        type,
        clockIn: existing?.clockIn,
        clockOut: existing?.clockOut,
      };
      dispatch({ type: "SET_SHIFT", payload: shift });
    },
    [shifts, dispatch],
  );

  const clockIn = useCallback(
    (staffId: string): void => {
      const time = new Date().toISOString();
      dispatch({ type: "CLOCK_IN", payload: { staffId, time } });
    },
    [dispatch],
  );

  const clockOut = useCallback(
    (staffId: string): void => {
      const time = new Date().toISOString();
      dispatch({ type: "CLOCK_OUT", payload: { staffId, time } });
    },
    [dispatch],
  );

  // === Checklist ===

  const toggleChecklistItem = useCallback(
    (id: string): void => {
      dispatch({ type: "TOGGLE_CHECKLIST", payload: id });
    },
    [dispatch],
  );

  const resetChecklist = useCallback(
    (type: ChecklistType): void => {
      dispatch({ type: "RESET_CHECKLIST", payload: type });
    },
    [dispatch],
  );

  const getChecklistProgress = useCallback(
    (type: ChecklistType): ChecklistProgress => {
      const items = checklist.filter((item) => item.type === type);
      const total = items.length;
      const checked = items.filter((item) => item.checked).length;
      const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
      return { checked, total, percent };
    },
    [checklist],
  );

  // === Performance ===

  const getPerformance = useCallback((): StaffPerformance[] => {
    return initialStaffPerformance;
  }, []);

  return {
    staff,
    shifts,
    checklist,
    activeStaffId,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleActive,
    login,
    logout,
    getActiveStaff,
    getShiftsForWeek,
    setShift,
    clockIn,
    clockOut,
    toggleChecklistItem,
    resetChecklist,
    getChecklistProgress,
    getPerformance,
  };
}
