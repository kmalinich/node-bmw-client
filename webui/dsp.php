<!DOCTYPE html>
<html lang="en">
	<head>
		<?php include './include/head.php'; ?>
		<?php include './include/css.php'; ?>
	</head>
	<body>
		<?php include './include/navbar.php'; ?>
		<div class="container-fluid">

			<h4 class="pull-right">Mode</h4>
			<div class="form-group">
				<select id="select-dsp-mode" class="form-control">
					<option value="concert-hall">Concert hall</option>
					<option value="jazz-club">Jazz club</option>
					<option value="cathederal">Cathederal</option>
					<option value="memory-1">Memory 1</option>
					<option value="memory-2">Memory 2</option>
					<option value="memory-3">Memory 3</option>
					<option value="off">DSP off</option>
				</select>
			</div>

			<hr/>

			<h4 class="pull-right">Reverb</h4>
			<input type="text" id="slider-dsp-reverb" name="dsp-reverb" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="always" data-slider-tooltip-position="top" />
			<h4 class="pull-right">Room size</h4>
			<input type="text" id="slider-dsp-room-size" name="dsp-room-size" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="always" data-slider-tooltip-position="top" />
			<hr/>
			<h4 class="pull-right">EQ</h4>
<!--
			<h5 class="">200Hz</h5>
			<h5 class="">500Hz</h5>
			<h5 class="">1KHz</h5>
			<h5 class="">2KHz</h5>
			<h5 class="">5KHz</h5>
			<h5 class="">12KHz</h5>
			<h5 class="">80Hz</h5>
-->

			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<input type="text" id="slider-dsp-" data-slider-orientation="vertical" data-slider-selection="after" name="dsp-" data-provide="slider" data-slider-min="0" data-slider-max="10" data-slider-value="0" data-slider-tooltip="hide" data-slider-reversed="true"/>
			<hr/>

			<div class="row">
				<div class="col-xs-12">
					<button class="btn btn-lg btn-success btn-block btn-lg" id="btn-dsp-send" onclick="javascript:dsp_send();"><i class="fa fa-floppy-o"></i> Save</button>
				</div>
			</div>

		</div>
	</body>
	<?php include './include/js.php'; ?>
</html>
