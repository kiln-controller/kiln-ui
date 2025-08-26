import Schedules from './routes/Schedules.svelte'
import Status from './routes/Status.svelte'
import NotFound from './routes/NotFound.svelte'

// Export the route definition object
export default {
    '/': Schedules,
    '/status': Status,
    // Catch-all, must be last
    '*': NotFound,
}