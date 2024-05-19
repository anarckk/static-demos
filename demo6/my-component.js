// my-component.js
import { ref } from 'vue'
export default {
  setup() {
    const count = ref(0)
    return { count }
  },
  template: /*html*/`<div>Count is: {{ count }}</div>`
}
