<script lang="ts">
  import { stored_logs, current_state } from "../lib/stores";
	import uPlot from "../lib/uPlot.svelte";
  import {
      Icon,
      Button,
      Row,
      Col,
      Modal,
      Table,
      Input,
      Tooltip
  } from '@sveltestrap/sveltestrap';

  let upload_modal_open = $state(false);
  const toggleUploadModalOpen = () => (upload_modal_open = !upload_modal_open);

  // Stop current schedule
  let stop_modal_open = $state(false);
  const toggleStopModalOpen = () => (stop_modal_open = !stop_modal_open);
  async function stopSchedule() {
    const response = await fetch(import.meta.env.VITE_KILN_URL + "kiln/schedule", {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'}
    });
    toggleStopModalOpen();
    if (!response.ok) { console.log(response) };
  }

  // uplot
  let data: [number[], number[]] = $state();

  // TODO: almost the same as redraw in Schedules, refactor
  function redraw() {
    if($current_state.runtime) {  // skip when undefined
      let x: Array<number> = [Date.now()/1000 - $current_state.runtime];  // timestamps
      let y: Array<number> = [$current_state.start_temperature];  // temperature
      for (let step of $current_state.schedule.steps) {
        // previous timestamp plus time to reach target in seconds (also don't break when dividing by zero)
        const ramp_duration_seconds = step[0] === 0 ? 0 : (Math.abs(step[1] - y.at(-1)) / step[0]) * 3600;
        let ramptime: number = x.at(-1) + ramp_duration_seconds;
        y.push(step[1], step[1]);
        // add ramptime plus hold to array
        x.push(ramptime, ramptime + step[2]*60);
      }
      data = [x, y];
    }
  }
  // Redraw graph when dependencies change
  $effect(redraw);
</script>

<style lang=css>
tbody {
  line-height: 1;
  font-size: 0.8rem;

  /* https://github.com/esphome/esphome-webserver/blob/main/v2/esp-log.ts#L105 */
  /* TODO: not readable in light mode */
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
    <div class="ps-2">
    <Modal body header="Confirm stop schedule" isOpen={stop_modal_open} toggle={toggleStopModalOpen}>
      Are you sure you want to stop the running <code>{$current_state.schedule.name}</code> schedule on the kiln?
      <Row class="mt-4">
      <Col>
        <Button color="danger" on:click={() => toggleStopModalOpen()}>Cancel</Button>
        <Button class="float-end" color="success" on:click={() => stopSchedule()}>Confirm</Button>
      </Col>
      </Row>
    </Modal>

    <!-- https://github.com/esphome/esphome-webserver/blob/86108e055a819b9ce655181f72988fa535dd12c7/packages/v3/src/esp-app.ts#L152 -->
    <Modal body header="Firmware upload" isOpen={upload_modal_open} toggle={toggleUploadModalOpen}>
      <form
        method="POST"
        action={import.meta.env.VITE_KILN_URL + "update"}
        enctype="multipart/form-data"
      >
      <Input type="file" name="file" accept="application/octet-stream"/>
      <Row class="mt-4">
      <Col>
        <Button on:click={() => toggleUploadModalOpen()}>Cancel</Button>
        <Button class="float-end" color="danger" type="submit">Confirm</Button>
      </Col>
      </Row>
      </form>
    </Modal>

    {#if Object.keys($current_state).length === 0}
      <span class="h2">Loading the Kiln data...</span><br>
    {:else if $current_state.schedule.name !== ""}
      <Button id="btn-stop-schedule" class="float-end me-1" color="danger" on:click={() => toggleStopModalOpen()}><Icon name="stop" /></Button>
      <Tooltip target="btn-stop-schedule" placement="bottom">
        Stop schedule
      </Tooltip>
      <span class="h2">{$current_state.schedule.name}</span><br>

      {@const SvelteComponent = uPlot}
      <SvelteComponent {data}/>

      Current temperature: {Math.round($current_state.temperature)}<br>

      <Table class="mt-4">
        <thead>
          <tr>
            <th>Step</th>
            <th>Ramp in °C/h</th>
            <th>Target °C</th>
            <th colspan="2">Hold in minutes</th>
          </tr>
        </thead>
        <tbody>
          {#each $current_state.schedule.steps as schedule, index}
            <tr class={index === $current_state.step ? 'table-active' : ''}>
              <th scope="row">{index}</th>
              {#each schedule as step}
                <td>{step}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </Table>
    {:else}
      <Button id="btn-upload-firmware" class="float-end me-1" color="warning" on:click={() => toggleUploadModalOpen()}><Icon name="wrench" /></Button>
      <Tooltip target="btn-upload-firmware" placement="bottom">
        Upload firmware
      </Tooltip>
      <span class="h2">No schedule running</span><br>
      Current temperature: {Math.round($current_state.temperature)}<br>
    {/if}
  </div>
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
