import { Plugin, PluginKey, Transaction, EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Highlight } from './highlightInterface';

// Create a unique key for this plugin
export const highlightPluginKey = new PluginKey<HighlightPluginState>('highlightPlugin');

// Define the state managed by this plugin
interface HighlightPluginState {
  decorations: DecorationSet;
  highlightData: Highlight[];
  activeHighlightId: string | number | null;
  onHighlightClick?: (highlightId: string | number) => void; // Callback for highlight clicks
  onSuggestionAccept?: (highlight: Highlight) => void; // Callback for accepting suggestions
  acceptedSuggestions: Set<string | number>; // Track which suggestions have been accepted
  lastClickTime?: number; // Track last click time for double-click detection
  lastClickId?: string | number; // Track last clicked highlight ID
}

// Function to create the ProseMirror plugin
export function createHighlightPlugin(options: { 
  onHighlightClick?: (highlightId: string | number) => void;
  onSuggestionAccept?: (highlight: Highlight) => void;
} = {}) {
  return new Plugin<HighlightPluginState>({
    key: highlightPluginKey,

    // --- Plugin State ---
    state: {
      // Initialize plugin state
      init() {
        return {
          decorations: DecorationSet.empty,
          highlightData: [] as Highlight[],
          activeHighlightId: null,
          onHighlightClick: options.onHighlightClick,
          onSuggestionAccept: options.onSuggestionAccept,
          acceptedSuggestions: new Set<string | number>(),
          lastClickTime: 0,
          lastClickId: undefined,
        };
      },

      // Apply changes to the state based on transactions
      apply(
        tr: Transaction,
        pluginState: HighlightPluginState,
        oldState: EditorState,
        newState: EditorState
      ): HighlightPluginState {
        // Check if metadata was passed specifically for this plugin
        const meta = tr.getMeta(highlightPluginKey);

        if (meta) {
          // If new highlight data, active ID, or callback was passed, update state
          const newHighlightData = meta.highlightData !== undefined ? meta.highlightData : pluginState.highlightData;
          const newActiveHighlightId = meta.activeHighlightId !== undefined ? meta.activeHighlightId : pluginState.activeHighlightId;
          // Check for callbacks either from meta or preserve from previous state
          const newOnHighlightClick = meta.onHighlightClick !== undefined ? meta.onHighlightClick : pluginState.onHighlightClick;
          const newOnSuggestionAccept = meta.onSuggestionAccept !== undefined ? meta.onSuggestionAccept : pluginState.onSuggestionAccept;
          // Update click tracking for double-click detection
          const newLastClickTime = meta.lastClickTime !== undefined ? meta.lastClickTime : pluginState.lastClickTime;
          const newLastClickId = meta.lastClickId !== undefined ? meta.lastClickId : pluginState.lastClickId;
          
          console.log('HighlightPluginLogic: Updating state with callback present:', !!newOnHighlightClick);

          // Only recalculate decorations if data actually changed
          if (newHighlightData !== pluginState.highlightData || 
              newActiveHighlightId !== pluginState.activeHighlightId || 
              newOnHighlightClick !== pluginState.onHighlightClick ||
              newOnSuggestionAccept !== pluginState.onSuggestionAccept ||
              newLastClickTime !== pluginState.lastClickTime ||
              newLastClickId !== pluginState.lastClickId) {
            
            const decorations = createDecorations(newState.doc, newHighlightData, newActiveHighlightId);
            return {
              decorations,
              highlightData: newHighlightData,
              activeHighlightId: newActiveHighlightId,
              onHighlightClick: newOnHighlightClick,
              onSuggestionAccept: newOnSuggestionAccept,
              acceptedSuggestions: pluginState.acceptedSuggestions,
              lastClickTime: newLastClickTime,
              lastClickId: newLastClickId,
            };
          }
        }

        // Check if the document changed in a way that might affect our decorations
        // For example: content added or removed that would shift positions
        if (tr.docChanged) {
          // Map the decorations to their new positions
          const newDecorations = pluginState.decorations.map(tr.mapping, tr.doc);
          
          // Return updated plugin state
          return {
            ...pluginState,
            decorations: newDecorations,
          };
        }
        
        // Always make sure to preserve the onHighlightClick callback
        // This ensures it's never lost even if we return the unchanged state
        return pluginState;
      },
    },

    // --- Plugin Props ---
    props: {
      // Expose the decorations from the plugin state to the editor view
      decorations(state: EditorState): DecorationSet | undefined {
        return highlightPluginKey.getState(state)?.decorations;
      },

      // --- Optional: Handle Clicks on Highlights ---
      handleClickOn(view, pos, node, nodePos, event, direct) {
        // Check if the click was inside one of our decorations
        const state = highlightPluginKey.getState(view.state);
        const decorations = state?.decorations;
        if (!decorations) return false;
        
        // Enhanced event debugging
        console.log('HighlightPluginLogic: Event detected:', event.type);
        console.log('HighlightPluginLogic: Event properties:', {
          type: event.type,
          button: event.button,
          detail: event.detail, // click count (1 for single, 2 for double, 3 for triple click)
          timeStamp: event.timeStamp
        });

        const clickedDecorations = decorations.find(pos, pos); // Find decorations at the click position
        const highlightDecoration = clickedDecorations.find(d => d.spec.highlightId); // Find one with our ID marker

        if (highlightDecoration) {
          const highlightId = highlightDecoration.spec.highlightId;
          const currentTime = Date.now();
          
          // Dispatch a transaction to set the active highlight
          view.dispatch(view.state.tr.setMeta(highlightPluginKey, { 
            activeHighlightId: highlightId,
            lastClickTime: currentTime,
            lastClickId: highlightId
          }));
          
          // Call the highlight click callback if it exists
          if (state?.onHighlightClick && highlightId) {
            console.log('HighlightPluginLogic: Calling onHighlightClick with ID:', highlightId);
            state.onHighlightClick(highlightId);
          } else {
            console.log('HighlightPluginLogic: Missing callback or highlightId', {
              hasCallback: !!state?.onHighlightClick,
              highlightId
            });
          }
          
          // Handle suggestion acceptance (Edge Case #6)
          if (state?.onSuggestionAccept) {
            // Find the highlight data for this ID
            const highlight = state.highlightData.find(h => h.id === highlightId);
            
            // Only process suggestions (not grammar or coherence highlights)
            if (highlight && highlight.type === 'suggestion' && highlight.correctVersion) {
              // Log for debugging
              console.log('HighlightPluginLogic: Suggestion highlight clicked:', highlight);
              
              // Custom double-click detection using time between clicks
              const isDoubleClick = (
                state.lastClickId === highlightId &&
                currentTime - (state.lastClickTime || 0) < 500 // 500ms threshold for double-click
              );
              
              console.log('HighlightPluginLogic: Double-click detection', {
                isDoubleClick,
                timeDifference: currentTime - (state.lastClickTime || 0),
                currentHighlightId: highlightId,
                lastClickId: state.lastClickId
              });
              
              if (isDoubleClick) {
                console.log('HighlightPluginLogic: Accepting suggestion:', highlight.correctVersion);
                
                // Apply the suggestion by replacing text
                const from = highlight.start;
                const to = highlight.end;
                
                // Replace with corrected version
                if (from !== undefined && to !== undefined) {
                  try {
                    // Create a transaction to replace the text
                    view.dispatch(view.state.tr.replaceWith(
                      from, 
                      to, 
                      view.state.schema.text(highlight.correctVersion)
                    ));
                    
                    // Mark this suggestion as accepted
                    state.acceptedSuggestions.add(highlight.id);
                    
                    // Call the suggestion accept callback
                    state.onSuggestionAccept(highlight);
                    
                    console.log('HighlightPluginLogic: Successfully applied suggestion');
                    
                    // Return true to indicate we handled the event
                    return true;
                  } catch (e) {
                    console.error('HighlightPluginLogic: Error applying suggestion:', e);
                  }
                }
              }
            }
          }
          
          return true; // Indicate we handled the click
        }
        return false;
      },
    },
  });
}

// --- Helpers for Creating Decorations ---
function createDecorations(doc: any, highlights: Highlight[], activeHighlightId: string | number | null): DecorationSet {
  // Create array to hold all decorations
  const decorations: Decoration[] = [];
  
  // Sort highlights by priority to handle overlaps appropriately
  // Grammar issues have higher priority than suggestions
  const priorityMap = {
    'grammar': 3,
    'coherence': 2,
    'suggestion': 1,
    'rewrite': 0
  };
  
  // Sort highlights by priority (higher first) and within same priority by length (shorter first)
  // This helps with overlapping highlights - grammar issues take precedence
  const sortedHighlights = [...highlights].sort((a, b) => {
    const priorityA = priorityMap[a.type as keyof typeof priorityMap] || 0;
    const priorityB = priorityMap[b.type as keyof typeof priorityMap] || 0;
    
    // First sort by priority
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    
    // If same priority, shorter spans take precedence over longer ones
    const lengthA = a.end - a.start;
    const lengthB = b.end - b.start;
    return lengthA - lengthB;
  });
  
  // Create a map to track highlight coverage
  const coveredRanges: {[key: number]: boolean} = {};
  const overlappingHighlights: {[key: string]: boolean} = {};
  
  // First pass: Identify overlapping highlights
  sortedHighlights.forEach(h => {
    const from = Math.max(0, Math.min(h.start, doc.content.size));
    const to = Math.max(from, Math.min(h.end, doc.content.size));
    
    // Check if this highlight overlaps with any existing ones
    for (let pos = from; pos < to; pos++) {
      if (coveredRanges[pos]) {
        overlappingHighlights[h.id] = true;
        break;
      }
    }
    
    // Mark the range as covered
    for (let pos = from; pos < to; pos++) {
      coveredRanges[pos] = true;
    }
  });
  
  // Second pass: Check if we have an active highlight
  const hasActiveHighlight = activeHighlightId !== null && 
                           sortedHighlights.some(h => h.id === activeHighlightId);

  // Process each highlight and create a decoration for it
  sortedHighlights.forEach(h => {
    // Position validation (always validate inputs from external sources)
    const from = Math.max(0, Math.min(h.start, doc.content.size));
    const to = Math.max(from, Math.min(h.end, doc.content.size));
    
    // Skip invalid positions or zero-length highlights
    if (from === to) return;
    
    // Overlapping highlight handling
    const isOverlapping = overlappingHighlights[h.id];
    
    // If there's an active highlight and this isn't it, don't show it
    if (hasActiveHighlight && h.id !== activeHighlightId) {
      // Skip this highlight since we only want to show the active one
      return;
    }
    
    // Different styling for each type of highlight
    let className = 'highlight';
    
    // Base class + type-specific class
    if (h.type) {
      className += ` highlight-${h.type}`;
    }
    
    // Add overlapping class if this highlight overlaps with others
    if (isOverlapping) {
      className += ' highlight-overlapping';
      console.log(`Highlight ${h.id} is overlapping with others`);
    }
    
    // Special styling for active highlights
    if (h.id === activeHighlightId) {
      className += ' highlight-active';
    }
    
    // Create a decoration with styling
    const decoration = Decoration.inline(
      from,
      to,
      {
        class: className,
        'data-highlight-id': h.id.toString(), // Add data attribute for easier handling
        'data-highlight-type': h.type,        // Add type as data attribute
        title: h.message || '',              // Show message on hover
      },
      // Store the highlight ID in the spec for later reference
      { highlightId: h.id }
    );
    
    decorations.push(decoration);
  });
  

  return DecorationSet.create(doc, decorations);
}
