import { create } from 'zustand';

interface FlowControlState {
  nextTaskTrigger: number; // A simple counter to act as a trigger
  requestNextTask: () => void;
}

export const useFlowControlStore = create<FlowControlState>((set: (fn: (state: FlowControlState) => Partial<FlowControlState>) => void) => ({
  nextTaskTrigger: 0,
  requestNextTask: () => set((state: FlowControlState) => {
    console.log('FlowControlStore: requestNextTask called. Current trigger:', state.nextTaskTrigger, 'New trigger:', state.nextTaskTrigger + 1);
    return { nextTaskTrigger: state.nextTaskTrigger + 1 };
  }),
}));
