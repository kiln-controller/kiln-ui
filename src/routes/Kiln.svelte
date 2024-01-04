<script lang="ts">
  import { stored_logs, current_state } from "../lib/stores";
  import uPlot from "uplot";
  import { onMount } from 'svelte';
  import {
      Icon,
      Button,
      Row,
      Col,
      Modal,
      Table,
  } from '@sveltestrap/sveltestrap';

  // Stop current schedule
  let stop_modal_open = false;
  const toggleStopModalOpen = () => (stop_modal_open = !stop_modal_open);
  async function uploadSchedule() {
    const response = await fetch(import.meta.env.VITE_KILN_URL + "kiln/schedule", {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'}
    });
    toggleStopModalOpen();
    if (!response.ok) { console.log(response) };
  }

  // uplot: https://github.com/leeoniya/uPlot/tree/master/docs
  let plotContainer: HTMLElement;
  let plot: uPlot;

  onMount(() => {
    plot = new uPlot({
        width: 600,
        height: 300,
        series: [
          {label: "Hours", value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}"},
          {label: "°C", stroke: "teal"}
        ],
        // 24h time format: https://github.com/leeoniya/uPlot/issues/83#issuecomment-570392055
        axes: [
          {
            values: [
              [3600 * 24 * 365,    "{YYYY}",               7,   "{YYYY}"                 ],
              [3600 * 24 * 28,     "{MMM}",                7,   "{MMM}\n{YYYY}"          ],
              [3600 * 24,          "{M}/{D}",              7,   "{M}/{D}\n{YYYY}"        ],
              [3600,               "{HH}:{mm}",            4,   "{HH}\n{M}/{D}"          ],
              [60,                 "{HH}:{mm}",            4,   "{HH}:{mm}\n{M}/{D}"     ],
              [1,                  "{HH}:{mm}:{ss}",       4,   "{HH}:{mm}:{ss}\n{M}/{D}"],
            ],
          }
        ]
    }, [], plotContainer);
	});

  $: $current_state, redraw();
  function redraw() {
    if(plot) {
      let x: Array<number> = [Date.now()/1000 - $current_state.runtime];  // timestamps
      let y: Array<number> = [$current_state.start_temperature];  // temperature
      for (let step of $current_state.schedule.steps) {
        // previous timestamp plus time to reach target in seconds
        let ramptime: number = x.at(-1) + (step[1]/step[0])*3600;
        y.push(step[1], step[1]);
        // add ramptime plus hold to array
        x.push(ramptime, ramptime + step[2]*60);
      }
      plot.setData([x, y]);

      // https://github.com/leeoniya/uPlot/issues/843#issuecomment-1602552129
      plot.setCursor({
        top: plot.valToPos($current_state.temperature, 'y'),
        left: plot.valToPos(Date.now()/1000, 'x'),
      })
      console.log("redraw");
    }
	}
</script>
<style lang=css>
tbody {
  line-height: 1;
  font-size: 0.8rem;

  /* https://github.com/esphome/esphome-webserver/blob/main/v2/esp-log.ts#L105 */
  & .v {
    color: #888888;
  }
  & .d {
    color: #00dddd;
  }
  & .c {
    color: magenta;
  }
  & .i {
    color: limegreen;
  }
  & .w {
    color: yellow;
  }
  & .e {
    color: red;
    font-weight: bold;
  }
}
</style>

<Row>
  <Col>
    <Modal body header="Confirm upload schedule" isOpen={stop_modal_open} toggle={toggleStopModalOpen}>
      Are you sure you want to stop the running <code>{$current_state.schedule.name}</code> schedule on the kiln?
      <Row class="mt-4">
      <Col>
        <Button color="danger" on:click={() => toggleStopModalOpen()}>Cancel</Button>
        <Button class="float-end" color="success" on:click={() => uploadSchedule()}>Confirm</Button>
      </Col>
      </Row>
    </Modal>

    {#if $current_state.schedule.name !== ""}
      <span class="h2 ps-2">{$current_state.schedule.name}</span><br>
      <Button class="float-end me-1" color="danger" on:click={() => toggleStopModalOpen()}><Icon name="stop" /></Button>
      <span class="ps-2">
      Current temperature: {Math.round($current_state.temperature)}<br>
      Current running step: {$current_state.step}<br>
      Current  {$current_state.schedule.steps}<br>
      </span>
      <div bind:this={plotContainer}></div>
    {:else}
      <span class="h2 ps-2">No schedule running</span><br>
      <span class="ps-2">
      Current temperature: {Math.round($current_state.temperature)}<br>
      </span>
    {/if}
  </Col>
  <Col>
    <Table borderless size="sm">
      <thead>
        <tr>
          <th>Time</th>
          <th>Level</th>
          <th>Tag</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
      {#each $stored_logs as log}
      <tr>
        <td class="{log.type} font-monospace">{log.when}</td>
        <td class="{log.type} font-monospace">{log.level}</td>
        <td class="{log.type} font-monospace">{log.type}</td>
        <td class="{log.type} font-monospace">{log.detail}</td>
      </tr>
      {/each}
      </tbody>
    </Table>
  </Col>
</Row>
