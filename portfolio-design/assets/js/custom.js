var additional_info = [];
var stepNumber = 1;
var totalSteps = 39;
const fullScreenSteps = ["#step_8", "#step_9", "#step_10", "#step_17", "#step_27", "#step_35", "#step_36"];

function gotoNextStep(current_step, next_step, clickedInput = null) {

    console.log(next_step);
    if (clickedInput) {
        $(clickedInput).find('input').prop("checked", true);
        const inputName = $(clickedInput).find('input').attr("name");
        const inputValue = $(clickedInput).find('input').val();

        // push clean key:value
        additional_info.push({
            [inputName]: inputValue
        });
    }

    if (fullScreenSteps.includes(next_step)) {
        $("#mobile_width").addClass("d-none");
    } else {
        $("#mobile_width").removeClass("d-none");
    }
    if (current_step == "#step_7") {
        handleAnimationStep();
    }
    if (current_step == "#step_35") {
        handleAnimationStep36();
        $("#additional_info").val(JSON.stringify(additional_info));
    }

    stepHideShow(current_step, next_step);

    updateProgressUI();
}

function handleAnimationStep() {
    $("#step_7").addClass("d-none");
    $("#step_8").removeClass("d-none");
    setTimeout(function () {
        $("#step_8").addClass("d-none");
        $("#step_9").removeClass("d-none");
        updateProgressUI();
    }, 2000);
    setTimeout(function () {
        $("#step_9").addClass("d-none");
        $("#step_10").removeClass("d-none");
        updateProgressUI();
    }, 3000);
}
function handleAnimationStep36() {
    $("#step_35").addClass("d-none");
    $("#step_36").removeClass("d-none");
    setTimeout(function () {
        $("#mobile_width").removeClass("d-none");
        $("#step_36").addClass("d-none");
        $("#step_37").removeClass("d-none");
        updateProgressUI();
    }, 2000);
}

function stepHideShow(current_step, next_step) {
    $(current_step).addClass('d-none');
    $(next_step).removeClass('d-none');
    $(current_step).hide();
    $(next_step).show();
    $('body,html').animate({ scrollTop: 0 }, 100);
}

function updateProgressUI() {
    stepNumber++;
    const percentage = (stepNumber / totalSteps) * 100;

    $(".progressbar_number").text(`${stepNumber}/${totalSteps}`);
    $(".progressbar_fill").css("width", percentage + "%");
}


$(document).ready(function () {
    $("#step_0").show();

    // Validate Gender & First Name
    $("#step_2_btn").click(function () {
        let gender = $("input[name='gender']:checked").val();
        let fname = $("input[name='first_name']").val().trim();
        let error = false;

        if (!gender) {
            $('.gender-error').removeClass('d-none');
            error = true;
        }

        // first name validation
        if (fname === '') {
            $('.fname-error').removeClass('d-none');
            error = true;
        }

        if (error) return;

        gotoNextStep("#step_2", "#step_3");
    });
    $("input[name='gender']").on('change', function () {
        $('.gender-error').addClass('d-none');
    });

    $("input[name='first_name']").on('input', function () {
        $('.fname-error').addClass('d-none');
    });

    // Validate Gender & First Name
    $("#step_6_btn").click(function () {
        let city = $("input[name='city']").val().trim();

        if (!city) {
            $('.city-error').removeClass('d-none');
        } else {
            gotoNextStep("#step_6", "#step_7");
        }

    });
    $("input[name='gender']").on('change', function () {
        $('.gender-error').addClass('d-none');
    });

    $("input[name='first_name']").on('input', function () {
        $('.fname-error').addClass('d-none');
    });

    var input = $('.city-input');
    var options = {
        types: ['(cities)']
    };

    var autocomplete = new google.maps.places.Autocomplete(input.get(0), options);
});