<!DOCTYPE html>
<html lang="en">
	<head>
		<?php include './include/head.php'; ?>
		<?php include './include/css.php'; ?>
	</head>
	<body onload="javascript:ws_ibus();">
		<?php include './include/navbar.php'; ?>
		<div class="container-fluid">
			<p id="ws-bus-header" class="text-warning">Socket connecting</p>
			<hr>
			<div class="table-live">
				<table class="table table-condensed table-hover table-bordered table-striped text-center" id="ws-bus-table">
					<thead>
						<tr>
							<th class="text-center">time</th>
							<th class="text-center">bus</th>
							<th class="text-center">src</th>
							<th class="text-center">dst</th>
							<th class="text-center">msg</th>
						</tr>
					</thead>
					<tbody>
					</tbody>
				</table>
			</div>
			<hr>
			<div class="row">
				<div class="col-lg-3 col-sm-6 col-xs-12">
					<select class="form-control input-lg" id="ws-bus-src">
						<option value="ABG">ABG</option>
						<option value="AHL">AHL</option>
						<option value="ANZV">ANZV</option>
						<option value="ASC">ASC</option>
						<option value="ASST">ASST</option>
						<option value="BMBT">BMBT</option>
						<option value="CCM">CCM</option>
						<option value="CDC">CDC</option>
						<option value="CDCD">CDCD</option>
						<option value="CID">CID</option>
						<option value="CSU">CSU</option>
						<option value="CVM">CVM</option>
						<option value="DIA">DIA</option>
						<option value="DME">DME</option>
						<option value="DME2">DME2</option>
						<option value="DSP">DSP</option>
						<option value="DSPC">DSPC</option>
						<option value="EGS">EGS</option>
						<option value="EHC">EHC</option>
						<option value="EKM">EKM</option>
						<option value="EKP">EKP</option>
						<option value="EWS">EWS</option>
						<option value="FBZV">FBZV</option>
						<option value="FHK">FHK</option>
						<option value="FID">FID</option>
						<option value="FMBT">FMBT</option>
						<option value="GLO">GLO</option>
						<option value="GM">GM</option>
						<option value="GR">GR</option>
						<option value="GT">GT</option>
						<option value="GTF">GTF</option>
						<option value="HAC">HAC</option>
						<option value="HKM">HKM</option>
						<option value="IHKA">IHKA</option>
						<option value="IKE">IKE</option>
						<option value="IRIS">IRIS</option>
						<option value="LCM">LCM</option>
						<option value="LOC">LOC</option>
						<option value="LWS">LWS</option>
						<option value="MFL">MFL</option>
						<option value="MID">MID</option>
						<option value="MID1">MID1</option>
						<option value="MM3">MM3</option>
						<option value="MML">MML</option>
						<option value="MMR">MMR</option>
						<option value="NAVC">NAVC</option>
						<option value="NAVE">NAVE</option>
						<option value="NAVJ">NAVJ</option>
						<option value="PDC">PDC</option>
						<option value="PIC">PIC</option>
						<option value="RAD">RAD</option>
						<option value="RCC">RCC</option>
						<option value="RCSC">RCSC</option>
						<option value="RDC">RDC</option>
						<option value="RLS">RLS</option>
						<option value="SDRS">SDRS</option>
						<option value="SES">SES</option>
						<option value="SHD">SHD</option>
						<option value="SM">SM</option>
						<option value="SMAD">SMAD</option>
						<option value="SOR">SOR</option>
						<option value="STH">STH</option>
						<option value="TCU">TCU</option>
						<option value="TEL">TEL</option>
						<option value="VID">VID</option>
					</select>
				</div>
				<div class="col-lg-3 col-sm-6 col-xs-12">
					<select class="form-control input-lg" id="ws-bus-dst">
						<option value="ABG">ABG</option>
						<option value="AHL">AHL</option>
						<option value="ANZV">ANZV</option>
						<option value="ASC">ASC</option>
						<option value="ASST">ASST</option>
						<option value="BMBT">BMBT</option>
						<option value="CCM">CCM</option>
						<option value="CDC">CDC</option>
						<option value="CDCD">CDCD</option>
						<option value="CID">CID</option>
						<option value="CSU">CSU</option>
						<option value="CVM">CVM</option>
						<option value="DIA">DIA</option>
						<option value="DME">DME</option>
						<option value="DME2">DME2</option>
						<option value="DSP">DSP</option>
						<option value="DSPC">DSPC</option>
						<option value="EGS">EGS</option>
						<option value="EHC">EHC</option>
						<option value="EKM">EKM</option>
						<option value="EKP">EKP</option>
						<option value="EWS">EWS</option>
						<option value="FBZV">FBZV</option>
						<option value="FHK">FHK</option>
						<option value="FID">FID</option>
						<option value="FMBT">FMBT</option>
						<option value="GLO">GLO</option>
						<option value="GM">GM</option>
						<option value="GR">GR</option>
						<option value="GT">GT</option>
						<option value="GTF">GTF</option>
						<option value="HAC">HAC</option>
						<option value="HKM">HKM</option>
						<option value="IHKA">IHKA</option>
						<option value="IKE">IKE</option>
						<option value="IRIS">IRIS</option>
						<option value="LCM">LCM</option>
						<option value="LOC">LOC</option>
						<option value="LWS">LWS</option>
						<option value="MFL">MFL</option>
						<option value="MID">MID</option>
						<option value="MID1">MID1</option>
						<option value="MM3">MM3</option>
						<option value="MML">MML</option>
						<option value="MMR">MMR</option>
						<option value="NAVC">NAVC</option>
						<option value="NAVE">NAVE</option>
						<option value="NAVJ">NAVJ</option>
						<option value="PDC">PDC</option>
						<option value="PIC">PIC</option>
						<option value="RAD">RAD</option>
						<option value="RCC">RCC</option>
						<option value="RCSC">RCSC</option>
						<option value="RDC">RDC</option>
						<option value="RLS">RLS</option>
						<option value="SDRS">SDRS</option>
						<option value="SES">SES</option>
						<option value="SHD">SHD</option>
						<option value="SM">SM</option>
						<option value="SMAD">SMAD</option>
						<option value="SOR">SOR</option>
						<option value="STH">STH</option>
						<option value="TCU">TCU</option>
						<option value="TEL">TEL</option>
						<option value="VID">VID</option>
					</select>
				</div>
				<div class="col-lg-3 col-sm-6 col-xs-12">
					<input type="text" class="form-control input-lg" placeholder="Message, comma separated" id="ws-bus-msg">
				</div>
				<div class="col-lg-3 col-sm-6 col-xs-12">
					<button class="btn btn-lg btn-primary btn-block" id="ws-bus-send">Send</button>
				</div>
			</div>
			<hr>
		</div>
	</body>
	<?php include './include/js.php'; ?>
</html>
