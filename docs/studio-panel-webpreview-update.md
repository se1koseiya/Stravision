# Studio Panel WebPreview Update

## Overview
Updated the AI assistant studio panel to replace the custom browser preview implementation with the new shadcn WebPreview component and fixed remaining blue colors to use the emerald theme.

## Changes Made

### 1. Color Theme Updates
- **Studio Header Icon**: Changed from blue to emerald colors
  - `bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400` 
  - → `bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400`

- **Plan Dialog Icon**: Updated high-level AI model icon colors
  - `bg-blue-100 dark:bg-blue-500/20` and `text-blue-600 dark:text-blue-400`
  - → `bg-emerald-100 dark:bg-emerald-500/20` and `text-emerald-600 dark:text-emerald-400`

### 2. WebPreview Component Integration
- **Replaced Custom Implementation**: Removed the complex custom browser preview code (lines 3060-3170)
- **Added shadcn WebPreview**: Integrated the new shadcn WebPreview component with:
  - Proper navigation bar with traffic light buttons
  - URL input field (read-only for display)
  - External link button for opening in new tab
  - Clean iframe rendering with proper sandbox attributes

### 3. Component Structure
```tsx
<WebPreview 
    defaultUrl={currentBrowserUrl}
    className="h-[400px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm"
>
    <WebPreviewNavigation className="bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-1.5 mr-3">
            <div className="size-2.5 rounded-full bg-red-400" />
            <div className="size-2.5 rounded-full bg-amber-400" />
            <div className="size-2.5 rounded-full bg-green-400" />
        </div>
        <WebPreviewUrl 
            value={currentBrowserUrl}
            className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            readOnly
        />
        <WebPreviewNavigationButton 
            tooltip="在新标签页打开"
            onClick={() => window.open(currentBrowserUrl, '_blank')}
        >
            <ArrowUpRight className="size-4" />
        </WebPreviewNavigationButton>
    </WebPreviewNavigation>
    <WebPreviewBody src={currentBrowserUrl} />
</WebPreview>
```

## Files Modified
- `app/ai-assistant/page.tsx` - Main AI assistant page with studio panel
- `app/test-studio-panel/page.tsx` - Test page for verifying changes

## Benefits
1. **Consistent Design**: All components now use emerald theme colors
2. **Better Functionality**: shadcn WebPreview provides more robust iframe handling
3. **Cleaner Code**: Removed complex custom implementation in favor of standardized component
4. **Better UX**: Proper navigation controls and external link functionality
5. **Maintainability**: Using established shadcn component reduces maintenance burden

## Testing
- Created test page at `/test-studio-panel` to verify:
  - Studio panel opens/closes correctly
  - Emerald colors are applied throughout
  - WebPreview component renders properly
  - URL switching works
  - External link button functions

## User Impact
- Studio panel now has consistent emerald branding
- Web preview functionality is more reliable
- Better visual consistency across the platform
- Improved accessibility with proper navigation controls