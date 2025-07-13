import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

export interface Application {
  _id: string;
  name: string;
  version: string;
  vendor: string;
  status: 'active' | 'deprecated' | 'eol' | 'eosl' | 'unknown';
  eolDate?: string;
  eoslDate?: string;
  latestMajorVersion?: string;
  criticalCVEs: CVE[];
  patchHistory: Patch[];
  metadata: {
    category: string;
    environment: string;
    criticality: string;
    tags: string[];
  };
  notes?: string;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  lastUpdatedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  securityRiskScore: number;
  daysUntilEOL?: number;
}

export interface CVE {
  cveId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  publishedDate?: string;
  lastModifiedDate?: string;
  cvssScore?: number;
}

export interface Patch {
  version: string;
  releaseDate?: string;
  description?: string;
  securityFixes: string[];
  bugFixes: string[];
}

interface ApplicationsState {
  applications: Application[];
  selectedApplication: Application | null;
  loading: boolean;
  error: string | null;
  filters: {
    vendor?: string;
    status?: string;
    category?: string;
    environment?: string;
    cveSeverity?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: ApplicationsState = {
  applications: [],
  selectedApplication: null,
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
};

// Async thunks
export const fetchApplications = createAsyncThunk(
  'applications/fetchApplications',
  async (params: { page?: number; limit?: number; filters?: any } = {}) => {
    const { page = 1, limit = 20, filters = {} } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const response = await axios.get(`/api/applications?${queryParams}`);
    return response.data;
  }
);

export const fetchApplicationById = createAsyncThunk(
  'applications/fetchApplicationById',
  async (id: string) => {
    const response = await axios.get(`/api/applications/${id}`);
    return response.data.application;
  }
);

export const createApplication = createAsyncThunk(
  'applications/createApplication',
  async (applicationData: Partial<Application>) => {
    const response = await axios.post('/api/applications', applicationData);
    return response.data.application;
  }
);

export const updateApplication = createAsyncThunk(
  'applications/updateApplication',
  async ({ id, data }: { id: string; data: Partial<Application> }) => {
    const response = await axios.put(`/api/applications/${id}`, data);
    return response.data.application;
  }
);

export const deleteApplication = createAsyncThunk(
  'applications/deleteApplication',
  async (id: string) => {
    await axios.delete(`/api/applications/${id}`);
    return id;
  }
);

export const fetchVendorData = createAsyncThunk(
  'applications/fetchVendorData',
  async (id: string) => {
    const response = await axios.post(`/api/applications/${id}/fetch-vendor-data`);
    return response.data.application;
  }
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setSelectedApplication: (state, action: PayloadAction<Application | null>) => {
      state.selectedApplication = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ApplicationsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setPagination: (state, action: PayloadAction<Partial<ApplicationsState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch applications
      .addCase(fetchApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload.applications;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch applications';
      })
      // Fetch application by ID
      .addCase(fetchApplicationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedApplication = action.payload;
      })
      .addCase(fetchApplicationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch application';
      })
      // Create application
      .addCase(createApplication.fulfilled, (state, action) => {
        state.applications.unshift(action.payload);
        state.pagination.total += 1;
      })
      // Update application
      .addCase(updateApplication.fulfilled, (state, action) => {
        const index = state.applications.findIndex(app => app._id === action.payload._id);
        if (index !== -1) {
          state.applications[index] = action.payload;
        }
        if (state.selectedApplication?._id === action.payload._id) {
          state.selectedApplication = action.payload;
        }
      })
      // Delete application
      .addCase(deleteApplication.fulfilled, (state, action) => {
        state.applications = state.applications.filter(app => app._id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedApplication?._id === action.payload) {
          state.selectedApplication = null;
        }
      })
      // Fetch vendor data
      .addCase(fetchVendorData.fulfilled, (state, action) => {
        const index = state.applications.findIndex(app => app._id === action.payload._id);
        if (index !== -1) {
          state.applications[index] = action.payload;
        }
        if (state.selectedApplication?._id === action.payload._id) {
          state.selectedApplication = action.payload;
        }
      });
  },
});

export const {
  setSelectedApplication,
  setFilters,
  clearFilters,
  setPagination,
  clearError,
} = applicationsSlice.actions;

export default applicationsSlice.reducer; 