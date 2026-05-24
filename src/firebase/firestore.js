// src/firebase/firestore.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// ─── CLIENTS ───────────────────────────────────────────────
export async function addClient(uid, data) {
  return addDoc(collection(db, "clients"), {
    ...data,
    uid,
    createdAt: serverTimestamp(),
  });
}

export async function updateClient(id, data) {
  return updateDoc(doc(db, "clients", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteClient(id) {
  return deleteDoc(doc(db, "clients", id));
}

export async function getClients(uid) {
  const q = query(collection(db, "clients"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── INVOICES ──────────────────────────────────────────────
export async function addInvoice(uid, data) {
  return addDoc(collection(db, "invoices"), {
    ...data,
    uid,
    createdAt: serverTimestamp(),
  });
}

export async function updateInvoice(id, data) {
  return updateDoc(doc(db, "invoices", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteInvoice(id) {
  return deleteDoc(doc(db, "invoices", id));
}

export async function getInvoices(uid) {
  const q = query(collection(db, "invoices"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getInvoiceById(id) {
  const snap = await getDoc(doc(db, "invoices", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── QUOTATIONS ────────────────────────────────────────────
export async function addQuotation(uid, data) {
  return addDoc(collection(db, "quotations"), {
    ...data,
    uid,
    createdAt: serverTimestamp(),
  });
}

export async function updateQuotation(id, data) {
  return updateDoc(doc(db, "quotations", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteQuotation(id) {
  return deleteDoc(doc(db, "quotations", id));
}

export async function getQuotations(uid) {
  const q = query(collection(db, "quotations"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── USER PROFILE ──────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateUserProfile(uid, data) {
  return updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
}
