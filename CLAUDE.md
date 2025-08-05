# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based university timetable application for INU (Incheon National University) built with Vite and Tailwind CSS. The application connects to a Spring Boot backend API and allows students to search for courses, manage a wishlist, and generate optimal timetable combinations using AI.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (connects to http://localhost:8080 API)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

### Package Management
- `npm install` - Install all dependencies
- `npm install <package>` - Add new dependency
- `npm install -D <package>` - Add development dependency

## Technology Stack

- **Frontend Framework**: React 18 with JSX
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with utility classes
- **Icons**: Lucide React
- **State Management**: React Context API + hooks (useState, useMemo, useEffect)
- **API Integration**: Fetch API with custom service layer
- **Authentication**: Context-based with localStorage persistence
- **Language**: JavaScript (not TypeScript)

## Architecture & Code Structure

### Project Structure
```
src/
├── components/          # Reusable UI components
│   └── AuthModal.jsx   # Login/Register modal
├── contexts/           # React Context providers
│   └── AuthContext.jsx # Authentication state management
├── services/           # API service layer
│   └── api.js         # All API endpoints and utilities
├── App.jsx            # Main application component
├── main.jsx           # React app entry point
└── index.css          # Tailwind CSS imports
```

### API Service Layer (`src/services/api.js`)
Centralized API communication with the Spring Boot backend:

1. **Authentication API** (`authAPI`)
   - `register()`: User registration
   - `login()`: User authentication

2. **Subject API** (`subjectAPI`)
   - `getAll()`: Paginated course list
   - `filter()`: Advanced course filtering
   - `getCount()`: Course count

3. **Wishlist API** (`wishlistAPI`)
   - `add()`: Add course to wishlist
   - `getByUser()`: Get user's wishlist
   - `remove()`: Remove from wishlist
   - `updatePriority()`: Change course priority

4. **Timetable API** (`timetableAPI`)
   - `add()`: Add course to personal timetable
   - `getByUser()`: Get user's timetable
   - `remove()`: Remove from timetable
   - `updateMemo()`: Update course memo

5. **Combination API** (`combinationAPI`)
   - `generate()`: Generate optimal timetable combinations

### Authentication System (`src/contexts/AuthContext.jsx`)
- React Context for global auth state
- localStorage persistence for user sessions
- Automatic session restoration on app load
- Provides: `user`, `isLoggedIn`, `login()`, `register()`, `logout()`

### Component Architecture

1. **Helper Functions**: Data manipulation utilities
   - `parseTime()`: API schedule data to UI format
   - `parseTimeString()`: Legacy time string parsing
   - `checkConflict()`: Schedule conflict detection
   - `formatCourse()`: API course data to UI format

2. **UI Components**: Functional React components
   - `Toast`: Notification system
   - `LoadingOverlay`: Progress indicator with animation
   - `MiniTimetable`: Grid-based timetable visualization
   - `CourseCard`: Individual course display cards
   - `AuthModal`: Login/Register modal

3. **Main App Component**: Central state management and API orchestration

### State Management Pattern
- **Global State**: Authentication via React Context
- **Local State**: React hooks (useState, useMemo, useEffect)
- **API State**: Loading states, error handling, data caching
- **Real-time Updates**: Automatic data refresh on user actions

### Data Flow Architecture
1. **Authentication**: Login → Context → localStorage → Global state
2. **Course Search**: Filters → API call → Format data → UI display
3. **Wishlist Management**: User action → API call → Local state update → UI refresh
4. **Timetable Management**: Conflict check → API call → State update → Visual feedback
5. **AI Generation**: Wishlist data → API processing → Results display

### Error Handling Strategy
- **Network Failures**: Graceful degradation to mock data
- **API Errors**: User-friendly toast notifications
- **Authentication Errors**: Automatic modal display
- **Validation Errors**: Inline form feedback

### Korean Localization
- Full Korean UI text and interactions
- Korean time format (월/화/수/목/금 for weekdays)
- Korean course type abbreviations (전핵, 전심, etc.)
- Korean error messages and notifications

### Responsive Design Pattern
- **Desktop**: Side-by-side layout with mini timetable
- **Mobile**: Stacked layout with floating action button
- **Adaptive Grids**: Course cards adjust to screen size
- **Touch-Friendly**: Adequate button sizes and spacing

## Key Features to Understand

### Time Parsing & Conflict Detection
- **API Format**: Backend sends schedule arrays with `dayOfWeek`, `startTime`, `endTime`
- **Legacy Support**: Maintains compatibility with string formats like "월 7-8, 수 5-6"
- **Conflict Algorithm**: Checks for overlapping time periods across same days
- **Visual Feedback**: Color-coded course blocks in timetable grid

### Authentication Flow
- **Login/Register**: Modal-based authentication
- **Session Persistence**: localStorage for user data
- **Context Integration**: Global auth state via React Context
- **Route Protection**: Features require authentication

### API Integration Pattern
- **Service Layer**: Centralized API calls in `src/services/api.js`
- **Error Handling**: Graceful fallback to mock data
- **Loading States**: UI feedback during API operations
- **Data Transformation**: Convert between API and UI formats

### AI Timetable Generation
- **Input**: User's wishlist with priorities
- **Processing**: Backend AI generates optimal combinations
- **Output**: Multiple timetable options with statistics
- **UI Feedback**: Progress animation during generation

## Development Guidelines

### Code Style
- Use functional components with hooks
- Prefer async/await for API calls
- Keep components focused and single-purpose
- Use descriptive Korean variable names where appropriate
- Follow the service layer pattern for new API endpoints

### Adding New Features
1. **API First**: Add API endpoint to `src/services/api.js`
2. **State Management**: Use React hooks or Context as appropriate
3. **UI Components**: Create in `src/components/` if reusable
4. **Error Handling**: Implement proper error boundaries and user feedback
5. **Korean Localization**: Ensure all text is in Korean
6. **Responsive Design**: Test on mobile and desktop

### Backend Dependencies
- **API Base URL**: `http://localhost:8080/api`
- **Expected Format**: Spring Boot REST API
- **Authentication**: Stateless, user data stored client-side
- **CORS**: Must be configured on backend for development

### Mock Data Strategy
When backend is unavailable:
- Service layer falls back to hardcoded mock data
- Mock data structure matches API response format
- Maintains full functionality for development/testing

### Testing Considerations
- **API Mocking**: Mock the service layer for unit tests
- **Korean Content**: Test with actual Korean characters
- **Time Parsing**: Verify both API and legacy time formats
- **Conflict Detection**: Test edge cases in schedule overlaps
- **Authentication**: Test login/logout flows and persistence

### Performance Notes
- **Debounced Search**: 1000ms delay on search input to reduce API calls
- **Pagination**: Server-side pagination (20 items per page) for fast loading
- **Memoized Calculations**: Course filtering and timetable grid
- **Lazy Loading**: Components load data only when needed
- **Optimistic Updates**: UI updates before API confirmation
- **Client-side Filtering**: Removed in favor of server-side filtering for better performance

### Pagination System
The application uses server-side pagination to handle large datasets efficiently:

**API Integration:**
- `/api/subjects/filter?page=0&size=20` - Paginated course search
- Supports page numbers (0-based) and page size configuration
- Returns paginated response with metadata (totalElements, totalPages, etc.)

**Frontend Components:**
- `Pagination.jsx` - Full-featured pagination component with page numbers
- Handles page navigation, loading states, and result counts
- Auto-scrolls to top on page change

**State Management:**
- `currentPage`, `totalPages`, `totalElements`, `pageSize` state variables
- `handlePageChange()` function for page navigation
- Filter changes reset to page 0

**Performance Benefits:**
- Reduced API response time: 30s-2min → 1-2s
- Lower memory usage: Only 20 items in DOM instead of 2000+
- Better user experience with loading indicators