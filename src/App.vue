<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { sendChatMessage, type ChatMessage } from './services/aiService';

const userName = ref('Clay');
const userInput = ref('');
const messages = ref<ChatMessage[]>([]);
const conversationHistory = ref<ChatMessage[]>([]);
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

const isDark = ref(true);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem('galacticai-theme', isDark.value ? 'dark' : 'light');
};

onMounted(() => {
  const savedTheme = localStorage.getItem('galacticai-theme');

  if (savedTheme === 'light') {
    isDark.value = false;
  } else if (savedTheme === 'dark') {
    isDark.value = true;
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
});

const scrollToBottom = async () => {
  await nextTick();

  if (chatContainer.value) {
    chatContainer.value.scrollTop =
      chatContainer.value.scrollHeight;
  }
};

const sendMessage = async (textToSend?: string) => {
  const query = textToSend || userInput.value;

  if (!query.trim() || loading.value) return;

  messages.value.push({
    role: 'user',
    content: query,
  });

  userInput.value = '';
  loading.value = true;

  await scrollToBottom();

  try {
    const aiResponse = await sendChatMessage(query, conversationHistory.value);

    conversationHistory.value.push(
      { role: 'user', content: query },
      { role: 'assistant', content: aiResponse },
    );

    messages.value.push({
      role: 'assistant',
      content: aiResponse,
    });
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: 'Terjadi kesalahan saat menghubungi AI.',
    });

    console.error(error);
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
};

const newChat = () => {
  if (loading.value) return;

  messages.value = [];
  conversationHistory.value = [];
  userInput.value = '';
};
</script>

<template>
  <div
    :class="[
      'flex flex-col h-dvh w-full font-sans antialiased overflow-hidden relative transition-colors duration-200',
      isDark
        ? 'bg-black text-white'
        : 'bg-white text-black'
    ]"
  >

    <!-- Floating Header -->
    <header
      class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 pointer-events-none"
    >
      <!-- Left -->
      <div class="flex items-center gap-3 pointer-events-auto">


        <!-- App Name -->
        <div
          :class="[
            'flex items-center gap-2 font-medium text-sm cursor-pointer py-2 px-3.5 rounded-2xl border backdrop-blur-xl shadow-lg transition-colors',
            isDark
              ? 'text-neutral-200 bg-neutral-950/80 border-neutral-800 hover:text-white'
              : 'text-neutral-800 bg-white/80 border-neutral-200 hover:text-black'
          ]"
        >
          <span>GalacticAI</span>

          <svg
            class="w-4 h-4 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

      </div>

      <!-- Right -->
      <div class="flex items-center gap-2 sm:gap-3 pointer-events-auto">

        <!-- Theme Toggle -->
        <button
          type="button"
          @click="toggleTheme"
          :class="[
            'p-2.5 rounded-2xl border backdrop-blur-xl shadow-lg transition-colors',
            isDark
              ? 'text-neutral-400 bg-neutral-950/80 border-neutral-800 hover:text-white hover:bg-neutral-900'
              : 'text-neutral-600 bg-white/80 border-neutral-200 hover:text-black hover:bg-neutral-50'
          ]"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <!-- Sun -->
          <svg
            v-if="isDark"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke-width="2"
            />
            <path
              stroke-linecap="round"
              stroke-width="2"
              d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
            />
          </svg>

          <!-- Moon -->
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-width="2"
              d="M21 12.79A9 9 0 1111.21 3
                 7 7 0 0021 12.79z"
            />
          </svg>
        </button>

        <!-- New Chat -->
        <button
          type="button"
          @click="newChat"
          :disabled="loading"
          :class="[
            'p-2.5 rounded-2xl border backdrop-blur-xl shadow-lg transition-colors disabled:opacity-40',
            isDark
              ? 'text-neutral-400 bg-neutral-950/80 border-neutral-800 hover:text-white hover:bg-neutral-900'
              : 'text-neutral-600 bg-white/80 border-neutral-200 hover:text-black hover:bg-neutral-50'
          ]"
          title="New Chat"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                 m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        <!-- Avatar -->
        <div
          :class="[
            'w-10 h-10 rounded-2xl border flex items-center justify-center text-xs font-semibold shadow-lg',
            isDark
              ? 'bg-white text-black border-white'
              : 'bg-black text-white border-black'
          ]"
        >
          {{ userName.charAt(0) }}
        </div>

      </div>
    </header>

    <!-- Main Chat Area -->
    <div
      ref="chatContainer"
      class="flex-1 min-h-0 overflow-y-auto px-4 pb-6 flex flex-col"
    >

      <!-- Welcome -->
      <div
        v-if="messages.length === 0"
        class="my-auto text-center space-y-4"
      >
        <h1
          :class="[
            'text-2xl sm:text-3xl font-medium tracking-tight transition-colors',
            isDark ? 'text-white' : 'text-black'
          ]"
        >
          Mari kita mulai,
          <span class="font-semibold">
            {{ userName }}
          </span>
        </h1>

        <p
          :class="[
            'text-sm',
            isDark ? 'text-neutral-500' : 'text-neutral-500'
          ]"
        >
          Tanyakan apa saja kepada GalacticAI.
        </p>
      </div>

      <!-- Chat -->
      <div
        v-else
        class="space-y-6 max-w-2xl mx-auto w-full pt-20 pb-4"
      >

        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="w-full flex flex-col"
        >

          <!-- User -->
          <div
            v-if="msg.role === 'user'"
            class="flex justify-end w-full"
          >
            <div
              :class="[
                'max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm sm:text-base leading-relaxed shadow-sm whitespace-pre-wrap',
                isDark
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
              ]"
            >
              {{ msg.content }}
            </div>
          </div>

          <!-- Assistant -->
          <div
            v-else
            :class="[
              'w-full text-left text-sm sm:text-base leading-relaxed py-2 whitespace-pre-wrap',
              isDark ? 'text-neutral-200' : 'text-neutral-800'
            ]"
          >
            {{ msg.content }}
          </div>

        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="w-full text-left py-2"
        >
          <div
            :class="[
              'inline-flex items-center gap-1.5 text-sm',
              isDark ? 'text-neutral-500' : 'text-neutral-400'
            ]"
          >
            <span
              :class="[
                'w-2 h-2 rounded-full animate-pulse',
                isDark ? 'bg-white' : 'bg-black'
              ]"
            />

            <span
              :class="[
                'w-2 h-2 rounded-full animate-pulse [animation-delay:0.2s]',
                isDark ? 'bg-white' : 'bg-black'
              ]"
            />

            <span
              :class="[
                'w-2 h-2 rounded-full animate-pulse [animation-delay:0.4s]',
                isDark ? 'bg-white' : 'bg-black'
              ]"
            />
          </div>
        </div>

      </div>
    </div>

    <!-- Bottom Input -->
    <footer
      class="flex-none p-4 max-w-2xl mx-auto w-full"
    >
      <div
        :class="[
          'relative flex items-center rounded-2xl px-3 py-2 border shadow-lg transition-colors',
          isDark
            ? 'bg-neutral-950 border-neutral-800 focus-within:border-neutral-600'
            : 'bg-white border-neutral-200 focus-within:border-neutral-400'
        ]"
      >


        <!-- Input -->
        <input
          v-model="userInput"
          @keyup.enter="sendMessage()"
          type="text"
          placeholder="Kirim pesan..."
          :class="[
            'flex-1 bg-transparent px-3 py-1.5 text-sm focus:outline-none',
            isDark
              ? 'text-white placeholder:text-neutral-600'
              : 'text-black placeholder:text-neutral-400'
          ]"
        />


        <!-- Send -->
        <button
          type="button"
          @click="sendMessage()"
          :disabled="loading || !userInput.trim()"
          :class="[
            'p-2 rounded-xl transition-all ml-1 disabled:opacity-30',
            isDark
              ? 'bg-white text-black hover:bg-neutral-200'
              : 'bg-black text-white hover:bg-neutral-800'
          ]"
          aria-label="Send message"
        >
          <svg
            class="w-4 h-4 rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>

      </div>
    </footer>

  </div>
</template>