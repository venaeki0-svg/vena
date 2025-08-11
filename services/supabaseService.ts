import { supabase } from '../lib/supabase';
import type { 
  Client, Project, Package, AddOn, TeamMember, Transaction, 
  Card, FinancialPocket, Lead, Asset, Contract, ClientFeedback,
  Notification, QRCodeRecord, SocialMediaPost, PromoCode, SOP,
  TeamProjectPayment, TeamPaymentRecord, RewardLedgerEntry, Profile
} from '../types';

// Generic CRUD operations
export const createRecord = async <T>(table: string, data: Omit<T, 'id' | 'created_at' | 'updated_at'>) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

export const updateRecord = async <T>(table: string, id: string, data: Partial<T>) => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

export const deleteRecord = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getRecords = async <T>(table: string, select: string = '*') => {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as T[];
};

// Specific service functions
export const clientService = {
  getAll: () => getRecords<Client>('clients'),
  create: (data: Omit<Client, 'id'>) => createRecord<Client>('clients', {
    name: data.name,
    email: data.email,
    phone: data.phone,
    instagram: data.instagram,
    since: data.since,
    status: data.status,
    client_type: data.clientType,
    last_contact: data.lastContact,
    portal_access_id: data.portalAccessId,
  }),
  update: (id: string, data: Partial<Client>) => updateRecord<Client>('clients', id, {
    name: data.name,
    email: data.email,
    phone: data.phone,
    instagram: data.instagram,
    since: data.since,
    status: data.status,
    client_type: data.clientType,
    last_contact: data.lastContact,
  }),
  delete: (id: string) => deleteRecord('clients', id),
};

export const projectService = {
  getAll: () => getRecords<Project>('projects'),
  create: (data: Omit<Project, 'id'>) => createRecord<Project>('projects', {
    project_name: data.projectName,
    client_name: data.clientName,
    client_id: data.clientId,
    project_type: data.projectType,
    package_name: data.packageName,
    package_id: data.packageId,
    add_ons: data.addOns,
    date: data.date,
    deadline_date: data.deadlineDate,
    location: data.location,
    progress: data.progress,
    status: data.status,
    active_sub_statuses: data.activeSubStatuses,
    total_cost: data.totalCost,
    amount_paid: data.amountPaid,
    payment_status: data.paymentStatus,
    team: data.team,
    notes: data.notes,
    accommodation: data.accommodation,
    drive_link: data.driveLink,
    client_drive_link: data.clientDriveLink,
    final_drive_link: data.finalDriveLink,
    start_time: data.startTime,
    end_time: data.endTime,
    image: data.image,
    revisions: data.revisions,
    promo_code_id: data.promoCodeId,
    discount_amount: data.discountAmount,
    shipping_details: data.shippingDetails,
    dp_proof_url: data.dpProofUrl,
    printing_details: data.printingDetails,
    printing_cost: data.printingCost,
    transport_cost: data.transportCost,
    is_editing_confirmed_by_client: data.isEditingConfirmedByClient,
    is_printing_confirmed_by_client: data.isPrintingConfirmedByClient,
    is_delivery_confirmed_by_client: data.isDeliveryConfirmedByClient,
    confirmed_sub_statuses: data.confirmedSubStatuses,
    client_sub_status_notes: data.clientSubStatusNotes,
    completed_digital_items: data.completedDigitalItems,
  }),
  update: (id: string, data: Partial<Project>) => updateRecord<Project>('projects', id, {
    project_name: data.projectName,
    client_name: data.clientName,
    client_id: data.clientId,
    project_type: data.projectType,
    package_name: data.packageName,
    package_id: data.packageId,
    add_ons: data.addOns,
    date: data.date,
    deadline_date: data.deadlineDate,
    location: data.location,
    progress: data.progress,
    status: data.status,
    active_sub_statuses: data.activeSubStatuses,
    total_cost: data.totalCost,
    amount_paid: data.amountPaid,
    payment_status: data.paymentStatus,
    team: data.team,
    notes: data.notes,
    accommodation: data.accommodation,
    drive_link: data.driveLink,
    client_drive_link: data.clientDriveLink,
    final_drive_link: data.finalDriveLink,
    start_time: data.startTime,
    end_time: data.endTime,
    image: data.image,
    revisions: data.revisions,
    promo_code_id: data.promoCodeId,
    discount_amount: data.discountAmount,
    shipping_details: data.shippingDetails,
    dp_proof_url: data.dpProofUrl,
    printing_details: data.printingDetails,
    printing_cost: data.printingCost,
    transport_cost: data.transportCost,
    is_editing_confirmed_by_client: data.isEditingConfirmedByClient,
    is_printing_confirmed_by_client: data.isPrintingConfirmedByClient,
    is_delivery_confirmed_by_client: data.isDeliveryConfirmedByClient,
    confirmed_sub_statuses: data.confirmedSubStatuses,
    client_sub_status_notes: data.clientSubStatusNotes,
    completed_digital_items: data.completedDigitalItems,
  }),
  delete: (id: string) => deleteRecord('projects', id),
};

export const packageService = {
  getAll: () => getRecords<Package>('packages'),
  create: (data: Omit<Package, 'id'>) => createRecord<Package>('packages', {
    name: data.name,
    price: data.price,
    physical_items: data.physicalItems,
    digital_items: data.digitalItems,
    processing_time: data.processingTime,
    photographers: data.photographers,
    videographers: data.videographers,
  }),
  update: (id: string, data: Partial<Package>) => updateRecord<Package>('packages', id, {
    name: data.name,
    price: data.price,
    physical_items: data.physicalItems,
    digital_items: data.digitalItems,
    processing_time: data.processingTime,
    photographers: data.photographers,
    videographers: data.videographers,
  }),
  delete: (id: string) => deleteRecord('packages', id),
};

export const transactionService = {
  getAll: () => getRecords<Transaction>('transactions'),
  create: (data: Omit<Transaction, 'id'>) => createRecord<Transaction>('transactions', {
    date: data.date,
    description: data.description,
    amount: data.amount,
    type: data.type,
    project_id: data.projectId,
    category: data.category,
    method: data.method,
    pocket_id: data.pocketId,
    card_id: data.cardId,
    printing_item_id: data.printingItemId,
  }),
  update: (id: string, data: Partial<Transaction>) => updateRecord<Transaction>('transactions', id, {
    date: data.date,
    description: data.description,
    amount: data.amount,
    type: data.type,
    project_id: data.projectId,
    category: data.category,
    method: data.method,
    pocket_id: data.pocketId,
    card_id: data.cardId,
    printing_item_id: data.printingItemId,
  }),
  delete: (id: string) => deleteRecord('transactions', id),
};

export const leadService = {
  getAll: () => getRecords<Lead>('leads'),
  create: (data: Omit<Lead, 'id'>) => createRecord<Lead>('leads', {
    name: data.name,
    contact_channel: data.contactChannel,
    location: data.location,
    status: data.status,
    date: data.date,
    notes: data.notes,
  }),
  update: (id: string, data: Partial<Lead>) => updateRecord<Lead>('leads', id, {
    name: data.name,
    contact_channel: data.contactChannel,
    location: data.location,
    status: data.status,
    date: data.date,
    notes: data.notes,
  }),
  delete: (id: string) => deleteRecord('leads', id),
};

export const profileService = {
  get: async (): Promise<Profile> => {
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Transform database format to app format
    return {
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      companyName: data.company_name,
      website: data.website,
      address: data.address,
      bankAccount: data.bank_account,
      authorizedSigner: data.authorized_signer,
      idNumber: data.id_number,
      bio: data.bio,
      incomeCategories: data.income_categories,
      expenseCategories: data.expense_categories,
      projectTypes: data.project_types,
      eventTypes: data.event_types,
      assetCategories: data.asset_categories,
      sopCategories: data.sop_categories,
      projectStatusConfig: data.project_status_config,
      notificationSettings: data.notification_settings,
      securitySettings: data.security_settings,
      briefingTemplate: data.briefing_template,
      termsAndConditions: data.terms_and_conditions,
    };
  },
  
  update: async (data: Partial<Profile>) => {
    const { error } = await supabase
      .from('user_profile')
      .update({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        company_name: data.companyName,
        website: data.website,
        address: data.address,
        bank_account: data.bankAccount,
        authorized_signer: data.authorizedSigner,
        id_number: data.idNumber,
        bio: data.bio,
        income_categories: data.incomeCategories,
        expense_categories: data.expenseCategories,
        project_types: data.projectTypes,
        event_types: data.eventTypes,
        asset_categories: data.assetCategories,
        sop_categories: data.sopCategories,
        project_status_config: data.projectStatusConfig,
        notification_settings: data.notificationSettings,
        security_settings: data.securitySettings,
        briefing_template: data.briefingTemplate,
        terms_and_conditions: data.termsAndConditions,
      })
      .eq('id', (await supabase.from('user_profile').select('id').single()).data?.id);
    
    if (error) throw error;
  }
};