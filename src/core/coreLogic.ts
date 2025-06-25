// import { handleOnboarding } from './onboarding';
// import { getCompletion } from './aiChatHandler';
// import { supabase } from './supabase'; // Import the centralized Supabase client

// export async function processMessage(chatId: string, messageText: string): Promise<string> {
//   try {
//     const { data: user, error } = await supabase
//       .from('users')
//       .select('onboarding_complete, onboarding_step')
//       .eq('chat_id', chatId)
//       .single();

//     if (error && error.code !== 'PGRST116') {
//       console.error('Error fetching user for coreLogic:', error);
//       return 'An unexpected error occurred. Please try again later.';
//     }

//     if (!user || user.onboarding_complete === false || user.onboarding_step !== null) {
//       // User is not onboarded or onboarding is in progress
//       const onboardingResponse = await handleOnboarding(chatId, messageText);
//       return onboardingResponse;
//     } else {
//       // User is onboarded, send to LLM
//       const llmResponse = await getCompletion(chatId, messageText);
//       return llmResponse;
//     }
//   } catch (error) {
//     console.error('Error in coreLogic.processMessage:', error);
//     return 'I apologize, but I encountered an internal error. Could you please try again?';
//   }
// }

// coreLogic.ts (updated snippet)
import { handleOnboarding } from './onboarding';
import { getCompletion }  from './aiChatHandler';
import { supabase } from './supabase';

export async function processMessage(chatId: string, messageText: string): Promise<string> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('onboarding_complete, onboarding_step') // Ensure these columns are selected
      .eq('chat_id', chatId)
      .single();

     if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user for coreLogic:', error);
      return 'An unexpected error occurred. Please try again later.';
    }

    console.log('User data from DB in coreLogic:', user); // Add this line
    console.log('Onboarding complete status:', user?.onboarding_complete); // Add this line

    const needsOnboarding = !user || user.onboarding_complete === false;

    console.log('Needs onboarding decision:', needsOnboarding);

    if (needsOnboarding) {
      const onboardingResponse = await handleOnboarding(chatId, messageText);
      return onboardingResponse;
    } else {
      // User is onboarded, send to LLM for general interaction
      const llmResponse = await getCompletion(chatId, messageText);
      return llmResponse;
    }
  } catch (error) {
    console.error('Error in coreLogic.processMessage:', error);
    return 'I apologize, but I encountered an internal error. Could you please try again?';
  }
}