<template>
  <div>
    <!-- Calendar Header -->
    <div class="flex justify-between items-center mb-4">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded-md"
        @click="goToPreviousMonth"
      >
        Forrige måned
      </button>
      <h2 class="text-xl font-bold">
        {{ formattedMonth }}
      </h2>
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded-md"
        @click="goToNextMonth"
      >
        Næste måned
      </button>
    </div>

    <!-- Calendar Container -->
    <div :class="['grid gap-4', isSmallScreen ? 'grid-cols-1' : 'grid-cols-7']">
      <!-- Loop through all days -->
      <div
        v-for="day in calendarDays"
        :key="day.date"
        class="border rounded-md p-4 bg-gray-50 shadow-md"
      >
        <!-- Date Header -->
        <h3 class="text-md font-semibold mb-2">{{ day.date }}</h3>

        <!-- Meals for the day -->
        <div v-if="day.meals.length > 0">
          <div v-for="meal in day.meals" :key="meal.id" class="mb-4">
            <h4 class="text-sm font-medium">{{ meal.name }}</h4>
            <p class="text-xs text-gray-600">{{ meal.description }}</p>

            <!-- Checkboxes -->
            <div class="mt-2">
              <label class="block text-xs font-medium mb-1">
                <input
                  type="checkbox"
                  v-model="meal.selected"
                  :true-value="1"
                  :false-value="0"
                  class="mr-2"
                />
                Deltager
              </label>
            </div>
            <div class="mt-2">
              <label class="block text-xs font-medium mb-1">
                <input
                  type="checkbox"
                  v-model="meal.takeawaySelected"
                  :true-value="1"
                  :false-value="0"
                  class="mr-2"
                />
                Take Away
              </label>
            </div>
          </div>
        </div>

        <!-- No events message -->
        <div v-else>
          <p class="text-xs text-gray-500 italic">No events for this day</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  subMonths,
  addMonths,
} from "date-fns";

export default {
  data() {
    return {
      token: null, // To store the token after login
      eventList: [], // Events fetched from the API
      isSmallScreen: window.innerWidth < 768, // Responsive layout
      currentMonth: new Date(), // Track the currently displayed month
    };
  },
  computed: {
    formattedMonth() {
      // Format the current month for display
      return format(this.currentMonth, "MMMM yyyy");
    },
    calendarDays() {
      // Determine the start and end of the current month
      const start = startOfMonth(this.currentMonth);
      const end = endOfMonth(this.currentMonth);

      // Create an array of all days in the current month
      const days = eachDayOfInterval({ start, end }).map((date) => ({
        date: format(date, "yyyy-MM-dd"),
        meals: [], // Initialize with no events
      }));

      // Map events to their corresponding days
      this.eventList.forEach((event) => {
        if (event.start) {
          const eventDate = event.start.split("T")[0]; // Extract the date part
          const day = days.find((d) => d.date === eventDate);

          if (day) {
            day.meals.push({
              id: event.id,
              name: event.name,
              description: event.description || "No description provided.",
              startTime: event.start,
              endTime: event.end,
            });
          }
        }
      });

      return days;
    },
  },
  mounted() {
    this.loginAndFetchEvents();
    window.addEventListener("resize", this.updateScreenSize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.updateScreenSize);
  },
  methods: {
    async loginAndFetchEvents() {
      try {
        // Login to fetch the token
        const loginResponse = await fetch("https://demo.spaces.heynabo.com/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "moryde@gmail.com", // Replace with valid email
            password: "dydmy1-mocmib-pycjEk", // Replace with valid password
          }),
        });

        if (!loginResponse.ok) {
          throw new Error("Failed to login");
        }

        const loginData = await loginResponse.json();
        this.token = loginData.token;

        // Fetch events using the token
        const eventsResponse = await fetch(
          "https://demo.spaces.heynabo.com/api/members/events",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/json",
            },
          }
        );

        if (!eventsResponse.ok) {
          throw new Error("Failed to fetch events");
        }

        const eventsData = await eventsResponse.json();
        this.eventList = eventsData.list; // Assuming `list` contains the events
      } catch (error) {
        console.error(error.message);
      }
    },
    updateScreenSize() {
      this.isSmallScreen = window.innerWidth < 768;
    },
    goToPreviousMonth() {
      this.currentMonth = subMonths(this.currentMonth, 1);
    },
    goToNextMonth() {
      this.currentMonth = addMonths(this.currentMonth, 1);
    },
  },
};
</script>