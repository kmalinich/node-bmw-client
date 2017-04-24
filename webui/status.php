<!DOCTYPE html>
<html lang="en">
	<head>
		<?php include './include/head.php'; ?>
		<?php include './include/css.php'; ?>
	</head>
	<body onload="javascript:status();">
		<?php include './include/navbar.php'; ?>
		<div class="container-fluid">
			<div class="row">

				<div class="col-lg-12 col-xs-12">

					<h4><i class="fa fa-car"></i> Vehicle</h4>
					<div class="row text-center">

						<div class="col-xs-6">
							<h6 id="vehicle-ignition" ></h6>
							<h6 id="engine-running"></h5>
							<h6 id="vehicle-handbrake"></h6>
							<h6 id="vehicle-reverse"  ></h6>
						</div>

						<div class="col-xs-6">
							<h6>Speed: <span id="vehicle-speed"></span> <span id="vehicle-speed-unit"></span></h6>
							<h6>Coolant: <span id="temperature-coolant"></span> °<span id="temperature-coolant-unit"></span></h6>
							<h6>Odometer: <span id="vehicle-odometer-mi"></span> mi</h6>
							<h6>VIN: <span id="vehicle-vin"></span></h6>
						</div>

					</div>

					<hr>

					<h4><i class="fa fa-key"></i> <span id="vehicle-locked"></span>, <span id="lights-interior"></span></h4>
					<div class="row text-center">

						<div class="col-xs-12">
							<div class="row">
								<h6 id="doors-hood"></h6>
							</div>
							<hr>
						</div>

						<div class="col-xs-12">
							<div class="row">
								<div class="col-xs-6">
									<h6 id="doors-front-left" ></h6>
									<h6 id="windows-front-left" ></h6>
								</div>
								<div class="col-xs-6">
									<h6 id="doors-front-right"></h6>
									<h6 id="windows-front-right"></h6>
								</div>
							</div>
							<hr>
						</div>

						<div class="col-xs-12">
							<div class="row">
								<h6 id="windows-roof"></h6>
							</div>
							<hr>
						</div>

						<div class="col-xs-12">
							<div class="row">
								<div class="col-xs-6">
									<h6 id="doors-rear-left" ></h6>
									<h6 id="windows-rear-left" ></h6>
								</div>
								<div class="col-xs-6">
									<h6 id="doors-rear-right"></h6>
									<h6 id="windows-rear-right"></h6>
								</div>
							</div>
							<hr>
						</div>

						<div class="col-xs-12">
							<h6 id="doors-trunk"></h6>
						</div>

					</div>

				</div>

			</div>

			<hr>

			<div class="row">

				<div class="col-lg-12 col-xs-12">
					<h4><i class="fa fa-desktop"></i> OBC</h4>

					<div class="row text-center">

						<div class="col-xs-6">
							<h5>Date/Time</h5>
							<h6><span id="obc-time"></span> <span id="obc-date"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Ext. temp</h5>
							<h6><span id="obc-temp-exterior"></span> °<span id="obc-temp-exterior-unit"></span></h6>
						</div>

					</div>

					<hr>

					<div class="row text-center">

						<div class="col-xs-6">
							<h5>Speed average</h5>
							<h6><span id="obc-speedavg"></span> <span id="obc-speedavg-unit"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Speed limit</h5>
							<h6><span id="obc-speedlimit"></span> <span id="obc-speedlimit-unit"></span></h6>
							<!--
							<h5></h5>
							<h6><span id="obc-"></span></h6>
							-->
						</div>

					</div>
					<hr>

					<div class="row text-center">
						<div class="col-xs-6">
							<h5>Distance</h5>
							<h6><span id="obc-distance"></span> <span id="obc-distance-unit"></span></h6>
						</div>
						<div class="col-xs-6">
							<h5>Range</h5>
							<h6><span id="obc-range"></span> <span id="obc-range-unit"></span></h6>
						</div>
					</div>

					<hr>

					<div class="row text-center">

						<div class="col-xs-6">
							<h5>MPG 1</h5>
							<h6><span id="obc-consumption-1"></span> <span id="obc-consumption-1-unit"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>MPG 2</h5>
							<h6><span id="obc-consumption-2"></span> <span id="obc-consumption-2-unit"></span></h6>
						</div>


					</div>

					<hr>

					<div class="row text-center">

						<div class="col-xs-6">
							<h5>Aux heat timer 1</h5>
							<h6><span id="obc-aux-heat-timer-1"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Aux heat timer 2</h5>
							<h6><span id="obc-aux-heat-timer-2"></span></h6>
						</div>

					</div>

					<hr>

					<div class="row text-center">

						<div class="col-xs-6">
							<h5>Stopwatch</h5>
							<h6><span id="obc-stopwatch"></span> sec</h6>
						</div>

						<div class="col-xs-6">
							<h5>Timer</h5>
							<h6><span id="obc-timer"></span> sec</h6>
						</div>

					</div>

					<hr>

				</div>

			</div>

			<div class="row">

				<div class="col-lg-12 col-xs-12">

					<h4><i class="fa fa-gear"></i> Coding data</h4>

					<div class="row text-center">

						<div class="col-xs-6">
							<h5>Consumption</h5>
							<h6><span id="obc-coding-unit-cons"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Distance</h5>
							<h6><span id="obc-coding-unit-distance"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Speed</h5>
							<h6><span id="obc-coding-unit-speed"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Temp</h5>
							<h6><span id="obc-coding-unit-temp"></span></h6>
						</div>

						<div class="col-xs-6">
							<h5>Time</h5>
							<h6><span id="obc-coding-unit-time"></span></h6>
						</div>

					</div>

				</div>
			</div>

		</div>
	</body>
	<?php include './include/js.php'; ?>
</html>
