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
      Form,
      Tooltip
  } from '@sveltestrap/sveltestrap';

  // Upload new firmware
  // https://github.com/esphome/esphome-webserver/blob/main/v2/esp-app.ts#L99
  let firmware: HTMLFormElement;
  let upload_modal_open = false;
  const toggleUploadModalOpen = () => (upload_modal_open = !upload_modal_open);
  async function uploadFirmware() {
    const response = await fetch(import.meta.env.VITE_KILN_URL + "update", {
      method: 'POST',
      body: new FormData(firmware)
    });
    toggleUploadModalOpen();
    if (!response.ok) { console.log(response) };
  }

  // Stop current schedule
  let stop_modal_open = false;
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
  let data: [number[], number[]];
  $: $current_state, redraw();

  function redraw() {
    if($current_state.runtime) {  // skip when undefined
      let x: Array<number> = [Date.now()/1000 - $current_state.runtime];  // timestamps
      let y: Array<number> = [$current_state.start_temperature];  // temperature
      for (let step of $current_state.schedule.steps) {
        // previous timestamp plus time to reach target in seconds
        let ramptime: number = x.at(-1) + (step[1]/step[0])*3600;
        y.push(step[1], step[1]);
        // add ramptime plus hold to array
        x.push(ramptime, ramptime + step[2]*60);
      }
      data = [x, y];
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
    <Modal body header="Confirm stop schedule" isOpen={stop_modal_open} toggle={toggleStopModalOpen}>
      Are you sure you want to stop the running <code>{$current_state.schedule.name}</code> schedule on the kiln?
      <Row class="mt-4">
      <Col>
        <Button color="danger" on:click={() => toggleStopModalOpen()}>Cancel</Button>
        <Button class="float-end" color="success" on:click={() => stopSchedule()}>Confirm</Button>
      </Col>
      </Row>
    </Modal>

    <Modal body header="Firmware upload" isOpen={upload_modal_open} toggle={toggleUploadModalOpen}>
      <form on:submit|preventDefault={uploadFirmware} bind:this={firmware} enctype="multipart/form-data">
      <Input type="file" accept=".bin"/>
      <Row class="mt-4">
      <Col>
        <Button on:click={() => toggleUploadModalOpen()}>Cancel</Button>
        <Button class="float-end" color="danger" type="submit">Confirm</Button>
      </Col>
      </Row>
      </form>
    </Modal>

    {#if Object.keys($current_state).length === 0}
      <span class="h2 ps-2">Loading the Kiln data...</span><br>
    {:else if $current_state.schedule.name !== ""}
      <Button id="btn-stop-schedule" class="float-end me-1" color="danger" on:click={() => toggleStopModalOpen()}><Icon name="stop" /></Button>
      <Tooltip target="btn-stop-schedule" placement="bottom">
        Stop schedule
      </Tooltip>
      <span class="h2 ps-2">{$current_state.schedule.name}</span><br>
      <svelte:component this={uPlot} {data}/>
      <span class="ps-2">Current temperature: {Math.round($current_state.temperature)}<br></span>
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
