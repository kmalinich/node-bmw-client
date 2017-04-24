<!DOCTYPE html>
<html lang="en">
	<head>
		<?php include './include/head.php'; ?>
		<?php include './include/css.php'; ?>
	</head>
	<body onload="javascript:prepare_gm();">
		<?php include './include/navbar.php'; ?>
		<div class="container-fluid">

			<h2>Interior lighting brightness</h2>
			<div id="slider-gm-interior-light"></div>
			<hr>

			<div class="row">
				<div class="col-xs-12">
					<button class="btn btn-raised btn-lg btn-primary btn-block btn-lg" id="btn-gm-unlock" onclick="javascript:gm_cl('toggle');"><i class="fa fa-unlock-alt"></i> Central locking</button>
				</div>
			</div>
			<hr>

			<div class="row">
				<div class="col-xs-6 block-left">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('lf', 'up');">LF window <i class="fa fa-arrow-up"></i></button>
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('lf', 'dn');">LF window <i class="fa fa-arrow-down"></i></button>
				</div>
				<div class="col-xs-6 block-right">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('rf', 'up');">RF window <i class="fa fa-arrow-up"></i></button>
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('rf', 'dn');">RF window <i class="fa fa-arrow-down"></i></button>
				</div>
			</div>
			<hr>

			<div class="row">
				<div class="col-xs-4 block-left">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('roof', 'up');">Roof <i class="fa fa-arrow-up"></i></button>
				</div>
				<div class="col-xs-4 block-center">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('roof', 'tt');">Roof <i class="fa fa-bars"></i></button>
				</div>
				<div class="col-xs-4 block-right">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('roof', 'dn');">Roof <i class="fa fa-arrow-down"></i></button>
				</div>
			</div>
			<hr>

			<div class="row">
				<div class="col-xs-6 block-left">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('lr', 'up');">LR window <i class="fa fa-arrow-up"></i></button>
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('lr', 'dn');">LR window <i class="fa fa-arrow-down"></i></button>
				</div>
				<div class="col-xs-6 block-right">
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('rr', 'up');">RR window <i class="fa fa-arrow-up"></i></button>
					<button class="btn btn-primary btn-lg btn-block btn-raised" id="btn-gm-lock" onclick="javascript:gm_windows('rr', 'dn');">RR window <i class="fa fa-arrow-down"></i></button>
				</div>
			</div>

		</div>
	</body>
	<?php include './include/js.php'; ?>
</html>
