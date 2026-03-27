// EatFlow POS - Mock Data for Greek Restaurant

import type { Table, Category, Product, Order } from './types'

export const initialTables: Table[] = [
  { id: 't1', number: 1, capacity: 2, status: 'available' },
  { id: 't2', number: 2, capacity: 2, status: 'available' },
  { id: 't3', number: 3, capacity: 4, status: 'available' },
  { id: 't4', number: 4, capacity: 4, status: 'available' },
  { id: 't5', number: 5, capacity: 4, status: 'available' },
  { id: 't6', number: 6, capacity: 6, status: 'available' },
  { id: 't7', number: 7, capacity: 6, status: 'available' },
  { id: 't8', number: 8, capacity: 2, status: 'available' },
  { id: 't9', number: 9, capacity: 4, status: 'available' },
  { id: 't10', number: 10, capacity: 4, status: 'available' },
  { id: 't11', number: 11, capacity: 6, status: 'available' },
  { id: 't12', number: 12, capacity: 8, status: 'available' },
]

export const initialCategories: Category[] = [
  { id: 'cat1', name: 'Ορεκτικά', order: 1 },
  { id: 'cat2', name: 'Σαλάτες', order: 2 },
  { id: 'cat3', name: 'Κυρίως Πιάτα', order: 3 },
  { id: 'cat4', name: 'Θαλασσινά', order: 4 },
  { id: 'cat5', name: 'Ποτά', order: 5 },
  { id: 'cat6', name: 'Κρασιά', order: 6 },
  { id: 'cat7', name: 'Επιδόρπια', order: 7 },
]

export const initialProducts: Product[] = [
  // Ορεκτικά (Appetizers)
  { id: 'p1', name: 'Τζατζίκι', price: 4.50, categoryId: 'cat1', description: 'Παραδοσιακό τζατζίκι με σκόρδο', vatRate: 13, available: true },
  { id: 'p2', name: 'Ταραμοσαλάτα', price: 5.00, categoryId: 'cat1', description: 'Σπιτική ταραμοσαλάτα', vatRate: 13, available: true },
  { id: 'p3', name: 'Μελιτζανοσαλάτα', price: 5.00, categoryId: 'cat1', description: 'Καπνιστή μελιτζάνα', vatRate: 13, available: true },
  { id: 'p4', name: 'Φέτα Ψητή', price: 6.50, categoryId: 'cat1', description: 'Φέτα στο φούρνο με πιπεριά και ντομάτα', vatRate: 13, available: true },
  { id: 'p5', name: 'Σαγανάκι', price: 7.00, categoryId: 'cat1', description: 'Τηγανητό τυρί κεφαλογραβιέρα', vatRate: 13, available: true },
  { id: 'p6', name: 'Κολοκυθοκεφτέδες', price: 6.00, categoryId: 'cat1', description: 'Σπιτικοί κολοκυθοκεφτέδες', vatRate: 13, available: true },
  
  // Σαλάτες (Salads)
  { id: 'p7', name: 'Χωριάτικη', price: 8.00, categoryId: 'cat2', description: 'Ντομάτα, αγγούρι, πιπεριά, κρεμμύδι, ελιές, φέτα', vatRate: 13, available: true },
  { id: 'p8', name: 'Σαλάτα του Σεφ', price: 9.50, categoryId: 'cat2', description: 'Μαρούλι, ρόκα, ντοματίνια, παρμεζάνα', vatRate: 13, available: true },
  { id: 'p9', name: 'Σαλάτα Κρητική', price: 8.50, categoryId: 'cat2', description: 'Παξιμάδι, ντομάτα, ξυνομυζήθρα', vatRate: 13, available: true },
  
  // Κυρίως Πιάτα (Main Courses)
  { id: 'p10', name: 'Μουσακάς', price: 12.00, categoryId: 'cat3', description: 'Παραδοσιακός μουσακάς', vatRate: 13, available: true },
  { id: 'p11', name: 'Παστίτσιο', price: 11.00, categoryId: 'cat3', description: 'Κλασικό παστίτσιο με κιμά', vatRate: 13, available: true },
  { id: 'p12', name: 'Σουβλάκι Χοιρινό', price: 10.00, categoryId: 'cat3', description: 'Δύο καλαμάκια με πίτα και πατάτες', vatRate: 13, available: true },
  { id: 'p13', name: 'Μπιφτέκι', price: 11.50, categoryId: 'cat3', description: 'Χειροποίητο μπιφτέκι με φέτα', vatRate: 13, available: true },
  { id: 'p14', name: 'Κοτόπουλο Σχάρας', price: 10.50, categoryId: 'cat3', description: 'Φιλέτο κοτόπουλο με λαχανικά', vatRate: 13, available: true },
  { id: 'p15', name: 'Αρνίσια Παϊδάκια', price: 16.00, categoryId: 'cat3', description: 'Παϊδάκια στα κάρβουνα', vatRate: 13, available: true },
  
  // Θαλασσινά (Seafood)
  { id: 'p16', name: 'Καλαμαράκια Τηγανητά', price: 12.00, categoryId: 'cat4', description: 'Τραγανά καλαμαράκια', vatRate: 13, available: true },
  { id: 'p17', name: 'Γαρίδες Σαγανάκι', price: 14.00, categoryId: 'cat4', description: 'Γαρίδες με σάλτσα φέτας', vatRate: 13, available: true },
  { id: 'p18', name: 'Τσιπούρα Σχάρας', price: 18.00, categoryId: 'cat4', description: 'Φρέσκια τσιπούρα', vatRate: 13, available: true },
  
  // Ποτά (Drinks)
  { id: 'p19', name: 'Νερό 500ml', price: 1.00, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p20', name: 'Νερό 1L', price: 1.50, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p21', name: 'Coca-Cola', price: 2.50, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p22', name: 'Πορτοκαλάδα', price: 2.50, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p23', name: 'Μπύρα Μύθος', price: 4.00, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p24', name: 'Μπύρα Fix', price: 4.00, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p25', name: 'Ούζο 200ml', price: 8.00, categoryId: 'cat5', vatRate: 24, available: true },
  { id: 'p26', name: 'Τσίπουρο', price: 6.00, categoryId: 'cat5', vatRate: 24, available: true },
  
  // Κρασιά (Wines)
  { id: 'p27', name: 'Κρασί Λευκό (500ml)', price: 8.00, categoryId: 'cat6', description: 'Χύμα λευκό κρασί', vatRate: 24, available: true },
  { id: 'p28', name: 'Κρασί Κόκκινο (500ml)', price: 8.00, categoryId: 'cat6', description: 'Χύμα κόκκινο κρασί', vatRate: 24, available: true },
  { id: 'p29', name: 'Κρασί Ροζέ (500ml)', price: 8.50, categoryId: 'cat6', description: 'Χύμα ροζέ κρασί', vatRate: 24, available: true },
  
  // Επιδόρπια (Desserts)
  { id: 'p30', name: 'Γαλακτομπούρεκο', price: 5.00, categoryId: 'cat7', description: 'Σπιτικό γαλακτομπούρεκο', vatRate: 13, available: true },
  { id: 'p31', name: 'Μπακλαβάς', price: 5.00, categoryId: 'cat7', description: 'Παραδοσιακός μπακλαβάς', vatRate: 13, available: true },
  { id: 'p32', name: 'Παγωτό', price: 4.50, categoryId: 'cat7', description: 'Δύο μπάλες της επιλογής σας', vatRate: 13, available: true },
  { id: 'p33', name: 'Φρέσκα Φρούτα', price: 6.00, categoryId: 'cat7', description: 'Εποχιακά φρούτα', vatRate: 13, available: true },
]

export const initialOrders: Order[] = []

// Helper function to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// Helper to format price in Greek format
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

// Helper to format date/time in Greek
export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(dateString))
}

export function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}
